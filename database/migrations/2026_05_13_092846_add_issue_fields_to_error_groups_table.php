<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('error_groups', function (Blueprint $table) {
            $table->unsignedInteger('display_number')->nullable()->after('fingerprint');
            $table->string('priority', 20)->default('none')->after('status');
            $table->text('description')->nullable()->after('priority');
            $table->boolean('is_handled')->default(false)->after('description');
            $table->string('linear_issue_url')->nullable()->after('is_handled');
            $table->json('subscriber_ids')->nullable()->after('linear_issue_url');
            $table->string('framework_version', 50)->nullable()->after('subscriber_ids');
            $table->string('language_version', 50)->nullable()->after('framework_version');

            $table->unique(['project_id', 'display_number']);
            $table->index(['project_id', 'priority']);
            $table->index(['project_id', 'assigned_to_user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('error_groups', function (Blueprint $table) {
            $table->dropUnique(['project_id', 'display_number']);
            $table->dropIndex(['project_id', 'priority']);
            $table->dropIndex(['project_id', 'assigned_to_user_id']);
            $table->dropColumn([
                'display_number',
                'priority',
                'description',
                'is_handled',
                'linear_issue_url',
                'subscriber_ids',
                'framework_version',
                'language_version',
            ]);
        });
    }
};
