<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $organization = Organization::firstOrCreate(
            ['slug' => 'myapp'],
            [
                'name' => 'MyApp',
                'plan' => 'free',
                'retention_days' => 30,
            ],
        );

        User::updateOrCreate(
            ['email' => 'super@admin.test'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('12345678'),
                'role' => User::ROLE_SUPER_ADMIN,
                'organization_id' => $organization->id,
                'remember_token' => Str::random(10),
            ],
        );
    }
}
