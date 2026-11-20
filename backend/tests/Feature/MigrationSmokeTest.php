<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MigrationSmokeTest extends TestCase
{
    public function test_scaffold_migrates_the_postgresql_test_database(): void
    {
        $this->assertSame('pgsql', DB::connection()->getPdo()->getAttribute(\PDO::ATTR_DRIVER_NAME));
        $this->assertSame('archive_test', DB::scalar('select current_database()'));
        $this->artisan('migrate')->assertExitCode(0);
        $this->assertTrue(Schema::hasTable('users'));
    }
}
