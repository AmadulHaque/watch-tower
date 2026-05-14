<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'error_group_id',
    'user_id',
    'type',
    'body',
    'meta',
])]
class IssueComment extends Model
{
    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    /**
     * @return BelongsTo<ErrorGroup, $this>
     */
    public function errorGroup(): BelongsTo
    {
        return $this->belongsTo(ErrorGroup::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
