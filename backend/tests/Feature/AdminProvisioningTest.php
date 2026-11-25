<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

final class AdminProvisioningTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate')->assertExitCode(0);
    }

    public function test_database_seeder_does_not_create_a_fixed_admin_account(): void
    {
        $this->artisan('db:seed')->assertExitCode(0);

        self::assertFalse(User::query()->where('username', 'test-user')->exists());
        self::assertFalse(User::query()->where('email', 'test@example.com')->exists());
    }

    public function test_admin_account_requires_interactive_identity_and_secret_password(): void
    {
        $username = 'provision_'.bin2hex(random_bytes(5));
        $email = $username.'@example.test';

        $this->artisan('archive:admin:create')
            ->expectsQuestion('Numele complet', 'Synthetic Admin')
            ->expectsQuestion('Adresa de e-mail', $email)
            ->expectsQuestion('Numele de utilizator', $username)
            ->expectsQuestion('Parola (nu va fi afișată)', 'synthetic-provisioning-password')
            ->expectsQuestion('Repetați parola', 'synthetic-provisioning-password')
            ->expectsOutputToContain('Contul Admin a fost creat.')
            ->assertExitCode(0);

        $user = User::query()->where('username', $username)->firstOrFail();
        self::assertSame('admin', $user->role);
        self::assertTrue(password_verify('synthetic-provisioning-password', $user->password));
    }
}
