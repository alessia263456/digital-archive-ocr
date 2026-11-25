<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

final class CititorProvisioningTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate')->assertExitCode(0);
    }

    public function test_cititor_account_requires_interactive_identity_and_secret_password(): void
    {
        $username = 'cititor_'.bin2hex(random_bytes(5));
        $email = $username.'@example.test';

        $this->artisan('archive:cititor:create')
            ->expectsQuestion('Numele complet', 'Cititor de test')
            ->expectsQuestion('Adresa de e-mail', $email)
            ->expectsQuestion('Numele de utilizator', $username)
            ->expectsQuestion('Parola (nu va fi afișată)', 'synthetic-cititor-password')
            ->expectsQuestion('Repetați parola', 'synthetic-cititor-password')
            ->expectsOutputToContain('Contul Cititor a fost creat.')
            ->assertExitCode(0);

        $user = User::query()->where('username', $username)->firstOrFail();
        self::assertSame('cititor', $user->role);
        self::assertTrue(password_verify('synthetic-cititor-password', $user->password));
    }

    public function test_cititor_account_rejects_an_existing_username_without_creating_a_user(): void
    {
        $username = 'cititor_existing_'.bin2hex(random_bytes(5));
        $existing = User::factory()->create(['username' => $username]);

        $this->artisan('archive:cititor:create')
            ->expectsQuestion('Numele complet', 'Cititor de test')
            ->expectsQuestion('Adresa de e-mail', 'new-cititor@example.test')
            ->expectsQuestion('Numele de utilizator', $username)
            ->expectsQuestion('Parola (nu va fi afișată)', 'synthetic-cititor-password')
            ->expectsQuestion('Repetați parola', 'synthetic-cititor-password')
            ->expectsOutputToContain('Numele de utilizator este deja folosit.')
            ->assertExitCode(1);

        self::assertSame(1, User::query()->where('username', $username)->count());
    }
}
