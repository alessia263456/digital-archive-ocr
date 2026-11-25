<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

final class CreateCititorAccount extends Command
{
    protected $signature = 'archive:cititor:create';

    protected $description = 'Creează interactiv contul Cititor al cabinetului.';

    public function handle(): int
    {
        $attributes = [
            'name' => $this->ask('Numele complet'),
            'email' => $this->ask('Adresa de e-mail'),
            'username' => $this->ask('Numele de utilizator'),
            'password' => $this->secret('Parola (nu va fi afișată)'),
        ];
        $passwordConfirmation = $this->secret('Repetați parola');

        $validator = Validator::make($attributes, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'password' => ['required', 'string'],
        ], [
            'name.required' => 'Numele complet este obligatoriu.',
            'email.required' => 'Adresa de e-mail este obligatorie.',
            'email.email' => 'Adresa de e-mail nu este validă.',
            'email.unique' => 'Adresa de e-mail este deja folosită.',
            'username.required' => 'Numele de utilizator este obligatoriu.',
            'username.unique' => 'Numele de utilizator este deja folosit.',
            'password.required' => 'Parola este obligatorie.',
        ]);

        if ($validator->fails()) {
            $this->components->error($validator->errors()->first());

            return self::FAILURE;
        }

        if (! is_string($passwordConfirmation) || ! hash_equals($attributes['password'], $passwordConfirmation)) {
            $this->components->error('Parolele nu coincid. Contul nu a fost creat.');

            return self::FAILURE;
        }

        User::query()->create($attributes + ['role' => 'cititor']);
        $this->components->info('Contul Cititor a fost creat.');

        return self::SUCCESS;
    }
}
