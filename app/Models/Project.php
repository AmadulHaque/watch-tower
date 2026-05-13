<?php

namespace App\Models;

use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'organization_id',
    'name',
    'slug',
    'description',
    'api_key',
    'api_secret_hash',
    'sampling_rate',
    'retention_days',
])]
#[Hidden(['api_secret_hash'])]
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory, HasUuids;

    protected function casts(): array
    {
        return [
            'sampling_rate' => 'float',
            'retention_days' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function admins(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }

    /**
     * @return HasMany<Trace, $this>
     */
    public function traces(): HasMany
    {
        return $this->hasMany(Trace::class);
    }

    /**
     * @return HasMany<ErrorGroup, $this>
     */
    public function errorGroups(): HasMany
    {
        return $this->hasMany(ErrorGroup::class);
    }

    /**
     * @return HasMany<ErrorOccurrence, $this>
     */
    public function errorOccurrences(): HasMany
    {
        return $this->hasMany(ErrorOccurrence::class);
    }

    /**
     * @return HasMany<TraceQuery, $this>
     */
    public function traceQueries(): HasMany
    {
        return $this->hasMany(TraceQuery::class);
    }

    /**
     * @return HasMany<EventOccurrence, $this>
     */
    public function eventOccurrences(): HasMany
    {
        return $this->hasMany(EventOccurrence::class);
    }

    /**
     * @return HasMany<QueueJobRun, $this>
     */
    public function queueJobRuns(): HasMany
    {
        return $this->hasMany(QueueJobRun::class);
    }

    /**
     * @return HasMany<CommandRun, $this>
     */
    public function commandRuns(): HasMany
    {
        return $this->hasMany(CommandRun::class);
    }

    /**
     * @return HasMany<ScheduledTaskRun, $this>
     */
    public function scheduledTaskRuns(): HasMany
    {
        return $this->hasMany(ScheduledTaskRun::class);
    }
}
