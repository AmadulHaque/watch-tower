<?php

namespace Database\Factories;

use App\Models\ErrorGroup;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ErrorGroup>
 */
class ErrorGroupFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $now = now();

        return [
            'project_id' => Project::factory(),
            'fingerprint' => hash('sha256', Str::random(20)),
            'display_number' => fake()->unique()->numberBetween(1, 100000),
            'exception_class' => 'RuntimeException',
            'first_message' => fake()->sentence(),
            'first_file' => 'app/Http/Controllers/ExampleController.php',
            'first_line' => fake()->numberBetween(1, 200),
            'total_count' => 1,
            'first_occurrence_at' => $now,
            'last_occurrence_at' => $now,
            'status' => 'unresolved',
            'priority' => 'none',
            'is_handled' => false,
        ];
    }
}
