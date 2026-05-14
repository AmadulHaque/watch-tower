<?php

namespace App\Http\Controllers\Project;

use App\Http\Controllers\Controller;
use App\Models\ErrorGroup;
use App\Models\IssueComment;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class IssueCommentsController extends Controller
{
    public function store(Project $project, int $issue, Request $request): RedirectResponse
    {
        /** @var ErrorGroup $group */
        $group = $project->errorGroups()
            ->where('display_number', $issue)
            ->firstOrFail();

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:65535'],
            'resolve' => ['sometimes', 'boolean'],
        ]);

        $group->comments()->create([
            'user_id' => $request->user()?->id,
            'type' => 'comment',
            'body' => $validated['body'],
        ]);

        if (! empty($validated['resolve'])) {
            $group->status = 'resolved';
            $group->resolved_at = now();
            $group->resolved_by_user_id = $request->user()?->id;
            $group->save();
        }

        return back();
    }

    public function destroy(Project $project, int $issue, IssueComment $comment, Request $request): RedirectResponse
    {
        /** @var ErrorGroup $group */
        $group = $project->errorGroups()
            ->where('display_number', $issue)
            ->firstOrFail();

        abort_unless($comment->error_group_id === $group->id, 404);
        abort_unless($comment->user_id === $request->user()?->id, 403);

        $comment->delete();

        return back();
    }
}
