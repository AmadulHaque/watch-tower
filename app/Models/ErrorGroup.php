<?php

namespace App\Models;

use Database\Factories\ErrorGroupFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'project_id',
    'fingerprint',
    'display_number',
    'exception_class',
    'first_message',
    'first_file',
    'first_line',
    'total_count',
    'first_occurrence_at',
    'last_occurrence_at',
    'status',
    'priority',
    'description',
    'is_handled',
    'linear_issue_url',
    'subscriber_ids',
    'framework_version',
    'language_version',
    'resolved_at',
    'resolved_by_user_id',
    'assigned_to_user_id',
    'resolution_note',
    'tags',
])]
class ErrorGroup extends Model
{
    /** @use HasFactory<ErrorGroupFactory> */
    use HasFactory, HasUuids;

    protected function casts(): array
    {
        return [
            'first_occurrence_at' => 'datetime',
            'last_occurrence_at' => 'datetime',
            'resolved_at' => 'datetime',
            'total_count' => 'integer',
            'first_line' => 'integer',
            'display_number' => 'integer',
            'is_handled' => 'boolean',
            'subscriber_ids' => 'array',
            'tags' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return HasMany<ErrorOccurrence, $this>
     */
    public function occurrences(): HasMany
    {
        return $this->hasMany(ErrorOccurrence::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_user_id');
    }

    /**
     * @return HasMany<IssueComment, $this>
     */
    public function comments(): HasMany
    {
        return $this->hasMany(IssueComment::class);
    }
}
