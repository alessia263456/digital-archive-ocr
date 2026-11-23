<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

final class AuthenticationAndRolesTest extends TestCase
{
    private const PASSWORD = 'synthetic-test-password';

    protected function setUp(): void
    {
        parent::setUp();

        self::assertSame('pgsql', DB::connection()->getPdo()->getAttribute(\PDO::ATTR_DRIVER_NAME));
        self::assertSame('archive_test', DB::scalar('select current_database()'));
        $this->artisan('migrate')->assertExitCode(0);

        Route::get('/api/__test/roles/admin', fn (Request $request) => response()->json([
            'role' => $request->user()->role,
        ]))->middleware(['auth:sanctum', 'role:admin']);

        Route::get('/api/__test/roles/staff', fn (Request $request) => response()->json([
            'role' => $request->user()->role,
        ]))->middleware(['auth:sanctum', 'role:admin,arhivar']);

        Route::get('/api/__test/roles/authenticated', fn (Request $request) => response()->json([
            'role' => $request->user()->role,
        ]))->middleware(['auth:sanctum', 'role:admin,arhivar,cititor']);
    }

    public function test_valid_credentials_return_a_token_and_only_approved_user_fields(): void
    {
        $user = $this->createUser('arhivar');

        $response = $this->postJson('/api/login', [
            'username' => $user->username,
            'password' => self::PASSWORD,
        ]);

        $response->assertOk()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.username', $user->username)
            ->assertJsonPath('user.role', 'arhivar')
            ->assertJsonMissingPath('user.name')
            ->assertJsonMissingPath('user.email');

        $token = $response->json('token');
        self::assertIsString($token);
        self::assertNotSame('', $token);

        $storedToken = DB::table('personal_access_tokens')
            ->where('tokenable_id', $user->id)
            ->first();
        self::assertNotNull($storedToken);
        self::assertNotSame($token, $storedToken->token);
        self::assertEqualsWithDelta(
            12 * 60 * 60,
            Carbon::parse($storedToken->expires_at)->getTimestamp()
                - Carbon::parse($storedToken->created_at)->getTimestamp(),
            1,
        );
    }

    public function test_unknown_username_and_wrong_password_return_the_same_generic_error(): void
    {
        $user = $this->createUser('admin');

        $unknownUsername = $this->postJson('/api/login', [
            'username' => 'missing-user',
            'password' => self::PASSWORD,
        ]);
        $wrongPassword = $this->postJson('/api/login', [
            'username' => $user->username,
            'password' => 'incorrect-password',
        ]);

        $unknownUsername->assertUnauthorized()
            ->assertJsonPath('eroare', 'Nume de utilizator sau parolă incorecte.');
        $wrongPassword->assertUnauthorized()
            ->assertExactJson($unknownUsername->json());
    }

    public function test_failed_credentials_are_rate_limited_but_validation_errors_are_not_counted(): void
    {
        $user = $this->createUser('cititor');
        $invalidRequest = ['username' => '', 'password' => ''];

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/login', $invalidRequest)
                ->assertUnprocessable()
                ->assertJsonPath('eroare', 'Datele de autentificare sunt incomplete sau nevalide.');
        }

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/login', [
                'username' => $user->username,
                'password' => 'incorrect-password',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/login', [
            'username' => $user->username,
            'password' => 'incorrect-password',
        ])->assertTooManyRequests()
            ->assertJsonPath('eroare', 'Prea multe încercări de autentificare. Încercați din nou mai târziu.');
    }

    public function test_logout_revokes_the_current_token(): void
    {
        $user = $this->createUser('admin');
        $token = $this->login($user);

        $this->withToken($token)->postJson('/api/logout')->assertNoContent();

        self::assertFalse(DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->exists());
        Auth::forgetGuards();
        $this->withToken($token)->getJson('/api/__test/roles/authenticated')->assertUnauthorized();
    }

    public function test_tokens_expire_twelve_hours_after_issuance(): void
    {
        $user = $this->createUser('admin');
        $token = $this->login($user);

        $this->withToken($token)->getJson('/api/__test/roles/authenticated')->assertOk();

        $this->travel(12)->hours();
        Auth::forgetGuards();
        $this->withToken($token)->getJson('/api/__test/roles/authenticated')->assertUnauthorized();
    }

    public function test_role_route_matrix_for_all_account_roles(): void
    {
        $roles = [
            'admin' => ['admin' => 200, 'staff' => 200, 'authenticated' => 200],
            'arhivar' => ['admin' => 403, 'staff' => 200, 'authenticated' => 200],
            'cititor' => ['admin' => 403, 'staff' => 403, 'authenticated' => 200],
        ];

        foreach ($roles as $role => $expectedStatuses) {
            $token = $this->login($this->createUser($role));

            foreach ($expectedStatuses as $route => $expectedStatus) {
                Auth::forgetGuards();
                $response = $this->withToken($token)->getJson('/api/__test/roles/'.$route);
                $response->assertStatus($expectedStatus);

                if ($expectedStatus === 403) {
                    $response->assertJsonPath('eroare', 'Nu aveți drepturi pentru această operațiune.');
                }
            }
        }
    }

    public function test_all_protected_test_routes_reject_unauthenticated_requests(): void
    {
        foreach (['admin', 'staff', 'authenticated'] as $route) {
            $this->getJson('/api/__test/roles/'.$route)
                ->assertUnauthorized()
                ->assertJsonPath('eroare', 'Autentificarea este necesară.');
        }
    }

    private function createUser(string $role): User
    {
        $suffix = bin2hex(random_bytes(6));

        return User::create([
            'name' => 'Synthetic User',
            'email' => 'auth-'.$suffix.'@example.test',
            'username' => 'auth_'.$suffix,
            'password' => self::PASSWORD,
            'role' => $role,
        ]);
    }

    private function login(User $user): string
    {
        $response = $this->postJson('/api/login', [
            'username' => $user->username,
            'password' => self::PASSWORD,
        ]);

        $response->assertOk();

        return (string) $response->json('token');
    }
}
