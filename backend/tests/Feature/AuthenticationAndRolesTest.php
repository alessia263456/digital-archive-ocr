<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Tests\TestCase;

final class AuthenticationAndRolesTest extends TestCase
{
    private const PASSWORD = 'synthetic-test-password';

    private ?string $csrfSessionCookie = null;
    private ?string $csrfToken = null;

    protected function setUp(): void
    {
        parent::setUp();

        self::assertSame('pgsql', DB::connection()->getPdo()->getAttribute(\PDO::ATTR_DRIVER_NAME));
        self::assertSame('archive_test', DB::scalar('select current_database()'));
        $this->artisan('migrate')->assertExitCode(0);
        config(['sanctum.stateful' => ['localhost']]);
        $this->withHeader('Origin', 'http://localhost');
        $csrf = $this->get('/sanctum/csrf-cookie');
        $sessionCookie = $csrf->getCookie(config('session.cookie'));
        $csrfCookie = $csrf->getCookie('XSRF-TOKEN');
        $this->csrfSessionCookie = $sessionCookie?->getValue();

        if ($sessionCookie !== null) {
            $this->withCookie(config('session.cookie'), $sessionCookie->getValue());
        }

        if ($csrfCookie !== null) {
            $token = rawurldecode($csrfCookie->getValue());
            $this->csrfToken = $token;
            $this->withCookie('XSRF-TOKEN', $csrfCookie->getValue())
                ->withHeader('X-XSRF-TOKEN', $token);
        }

        Route::get('/api/__test/roles/admin', fn (Request $request) => response()->json([
            'role' => $request->user()->role,
        ]))->middleware(['auth:web', 'role:admin']);

        Route::get('/api/__test/roles/staff', fn (Request $request) => response()->json([
            'role' => $request->user()->role,
        ]))->middleware(['auth:web', 'role:admin,arhivar']);

        Route::get('/api/__test/roles/authenticated', fn (Request $request) => response()->json([
            'role' => $request->user()->role,
        ]))->middleware(['auth:web', 'role:admin,arhivar,cititor']);
    }

    public function test_valid_credentials_start_a_session_and_return_only_approved_user_fields(): void
    {
        $user = $this->createUser('arhivar');

        $response = $this->postJson('/api/login', [
            'username' => $user->username,
            'password' => self::PASSWORD,
        ]);

        $response->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.username', $user->username)
            ->assertJsonPath('user.role', 'arhivar')
            ->assertJsonMissingPath('user.name')
            ->assertJsonMissingPath('user.email');

        $response->assertJsonMissingPath('token')->assertJsonMissingPath('token_type');
        $sessionCookie = $response->getCookie(config('session.cookie'));
        self::assertNotNull($sessionCookie);
        self::assertNotSame($this->csrfSessionCookie, $sessionCookie->getValue());
        self::assertTrue($sessionCookie->isHttpOnly());
        self::assertSame('lax', strtolower((string) $sessionCookie->getSameSite()));
        $this->withCookie(config('session.cookie'), $sessionCookie->getValue());
        self::assertFalse(DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->exists());
        $this->getJson('/api/user')->assertOk()->assertJsonPath('id', $user->id)
            ->assertJsonPath('username', $user->username)->assertJsonPath('role', 'arhivar')
            ->assertJsonMissingPath('email')->assertJsonMissingPath('name');
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

    public function test_state_changing_request_requires_a_matching_csrf_token(): void
    {
        $this->withHeader('X-XSRF-TOKEN', 'invalid-token')
            ->postJson('/api/login', ['username' => 'missing-user', 'password' => self::PASSWORD])
            ->assertStatus(419)
            ->assertJsonPath('eroare', 'Sesiunea a expirat. Reîncărcați pagina și încercați din nou.');
    }

    public function test_logout_invalidates_the_session(): void
    {
        $user = $this->createUser('admin');
        $this->login($user);
        $logout = $this->postJson('/api/logout')->assertNoContent();
        $csrfCookie = $logout->getCookie('XSRF-TOKEN');
        self::assertNotNull($csrfCookie);
        self::assertNotSame($this->csrfToken, rawurldecode($csrfCookie->getValue()));
        Auth::forgetGuards();
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_session_expires_after_thirty_minutes_of_inactivity(): void
    {
        $user = $this->createUser('admin');
        $this->login($user);
        $this->getJson('/api/user')->assertOk();
        $this->travel(31)->minutes();
        Auth::forgetGuards();
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_session_expires_after_twelve_hours_even_with_recent_activity(): void
    {
        $user = $this->createUser('admin');
        $this->login($user);
        $this->travel(11)->hours();
        $this->getJson('/api/user')->assertOk();
        $this->travel(61)->minutes();
        Auth::forgetGuards();
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_legacy_bearer_tokens_do_not_authenticate_application_routes(): void
    {
        $user = $this->createUser('admin');
        $secret = Str::random(40);
        DB::table('personal_access_tokens')->insert([
            'tokenable_type' => User::class,
            'tokenable_id' => $user->id,
            'name' => 'legacy',
            'token' => hash('sha256', $secret),
            'abilities' => '["*"]',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withToken((string) $user->id.'|'.$secret)->getJson('/api/user')->assertUnauthorized();
        $this->withToken((string) $user->id.'|'.$secret)->getJson('/api/__test/roles/admin')->assertUnauthorized();
    }

    public function test_role_route_matrix_for_all_account_roles(): void
    {
        $roles = [
            'admin' => ['admin' => 200, 'staff' => 200, 'authenticated' => 200],
            'arhivar' => ['admin' => 403, 'staff' => 200, 'authenticated' => 200],
            'cititor' => ['admin' => 403, 'staff' => 403, 'authenticated' => 200],
        ];

        foreach ($roles as $role => $expectedStatuses) {
            $this->login($this->createUser($role));

            foreach ($expectedStatuses as $route => $expectedStatus) {
                Auth::forgetGuards();
                $response = $this->getJson('/api/__test/roles/'.$route);
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

    private function login(User $user): void
    {
        $response = $this->postJson('/api/login', [
            'username' => $user->username,
            'password' => self::PASSWORD,
        ]);

        $response->assertOk();
        $sessionCookie = $response->getCookie(config('session.cookie'));

        if ($sessionCookie !== null) {
            $this->withCookie(config('session.cookie'), $sessionCookie->getValue());
        }

    }
}
