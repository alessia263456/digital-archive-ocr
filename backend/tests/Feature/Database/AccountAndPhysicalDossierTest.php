<?php

namespace Tests\Feature\Database;

use App\Models\PhysicalDossier;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

final class AccountAndPhysicalDossierTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        self::assertSame('pgsql', DB::connection()->getPdo()->getAttribute(\PDO::ATTR_DRIVER_NAME));
        self::assertSame('archive_test', DB::scalar('select current_database()'));
        $this->artisan('migrate')->assertExitCode(0);
    }

    public function test_username_password_and_role_are_required_by_the_database(): void
    {
        $account = [
            'name' => 'Test User',
            'email' => 'required-'.bin2hex(random_bytes(6)).'@example.test',
            'username' => 'required_'.bin2hex(random_bytes(6)),
            'password' => 'not-a-real-password-hash',
            'role' => 'admin',
        ];

        foreach (['username', 'password', 'role'] as $required) {
            $missing = $account;
            unset($missing[$required]);

            $this->assertInsertIsRejected('users', $missing, '23502');
        }
    }

    public function test_username_is_unique_and_role_is_limited_to_approved_values(): void
    {
        $username = 'unique_'.bin2hex(random_bytes(6));
        $this->insertAccount($username, 'admin');

        $this->assertInsertIsRejected('users', $this->accountAttributes($username), '23505');
        $this->assertInsertIsRejected('users', $this->accountAttributes('invalid_'.bin2hex(random_bytes(6)), 'owner'), '23514');
    }

    public function test_user_model_stores_a_verifiable_password_hash(): void
    {
        $password = 'test-password-'.bin2hex(random_bytes(6));
        $user = User::create([
            'name' => 'Factory Test User',
            'email' => 'hash-'.bin2hex(random_bytes(6)).'@example.test',
            'username' => 'hash_'.bin2hex(random_bytes(6)),
            'password' => $password,
            'role' => 'arhivar',
        ]);

        self::assertNotSame($password, $user->password);
        self::assertTrue(Hash::check($password, $user->password));
    }

    public function test_physical_dossier_preserves_the_printed_number_and_allows_repeats(): void
    {
        $printedNumber = 'Dosar nr. 029/02014';
        $first = PhysicalDossier::create(['physical_dossier_number' => $printedNumber]);
        $second = PhysicalDossier::create(['physical_dossier_number' => $printedNumber]);

        self::assertSame($printedNumber, $first->physical_dossier_number);
        self::assertSame($printedNumber, $second->fresh()->physical_dossier_number);
        self::assertNotSame($first->getKey(), $second->getKey());
        self::assertGreaterThanOrEqual(2, PhysicalDossier::query()->where('physical_dossier_number', $printedNumber)->count());
    }

    /** @param array<string, mixed> $attributes */
    private function assertInsertIsRejected(string $table, array $attributes, string $expectedSqlState): void
    {
        try {
            DB::table($table)->insert($attributes);
            self::fail("Expected the {$table} insert to violate a database constraint.");
        } catch (QueryException $exception) {
            self::assertSame($expectedSqlState, (string) ($exception->errorInfo[0] ?? $exception->getCode()));
        }
    }

    /** @return array<string, string> */
    private function accountAttributes(string $username, string $role = 'cititor'): array
    {
        return [
            'name' => 'Test User',
            'email' => 'account-'.bin2hex(random_bytes(6)).'@example.test',
            'username' => $username,
            'password' => 'not-a-real-password-hash',
            'role' => $role,
        ];
    }

    private function insertAccount(string $username, string $role): void
    {
        DB::table('users')->insert($this->accountAttributes($username, $role));
    }
}
