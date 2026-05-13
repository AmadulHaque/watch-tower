<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('error_occurrences', function (Blueprint $table) {
            $table->boolean('is_handled')->default(false)->after('line');
        });
    }

    public function down(): void
    {
        Schema::table('error_occurrences', function (Blueprint $table) {
            $table->dropColumn('is_handled');
        });
    }
};
