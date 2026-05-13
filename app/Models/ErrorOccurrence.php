<?php

namespace App\Models;

use Database\Factories\ErrorOccurrenceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'project_id',
    'trace_id',
    'error_group_id',
    'exception_class',
    'message',
    'stacktrace',
    'fingerprint',
    'user_identifier',
    'user_email',
    'file',
    'line',
    'is_handled',
    'environment',
    'release_version',
    'context',
    'occurred_at',
])]
class ErrorOccurrence extends Model
{
    /** @use HasFactory<ErrorOccurrenceFactory> */
    use HasFactory, HasUuids;

    protected function casts(): array
    {
        return [
            'stacktrace' => 'array',
            'context' => 'array',
            'line' => 'integer',
            'is_handled' => 'boolean',
            'occurred_at' => 'datetime',
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
     * @return BelongsTo<Trace, $this>
     */
    public function trace(): BelongsTo
    {
        return $this->belongsTo(Trace::class);
    }

    /**
     * @return BelongsTo<ErrorGroup, $this>
     */
    public function errorGroup(): BelongsTo
    {
        return $this->belongsTo(ErrorGroup::class);
    }
}
