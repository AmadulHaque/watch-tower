<?php

use App\Models\ErrorGroup;
use App\Models\IssueComment;
use App\Models\Project;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
    $this->project = Project::factory()->create();
    $this->group = ErrorGroup::factory()->create([
        'project_id' => $this->project->id,
        'display_number' => 42,
    ]);
});

it('stores a comment on an issue', function () {
    $response = $this->actingAs($this->user)->post(
        route('projects.issues.comments.store', [
            'project' => $this->project->slug,
            'issue' => $this->group->display_number,
        ]),
        ['body' => 'Hello, this is a comment.']
    );

    $response->assertRedirect();

    expect($this->group->comments()->count())->toBe(1);

    $comment = $this->group->comments()->first();
    expect($comment->body)->toBe('Hello, this is a comment.');
    expect($comment->user_id)->toBe($this->user->id);
    expect($comment->type)->toBe('comment');
});

it('resolves the issue when resolve flag is set', function () {
    $response = $this->actingAs($this->user)->post(
        route('projects.issues.comments.store', [
            'project' => $this->project->slug,
            'issue' => $this->group->display_number,
        ]),
        ['body' => 'Fixed it.', 'resolve' => true]
    );

    $response->assertRedirect();

    $this->group->refresh();
    expect($this->group->status)->toBe('resolved');
    expect($this->group->resolved_at)->not->toBeNull();
    expect($this->group->resolved_by_user_id)->toBe($this->user->id);
});

it('rejects empty comment body', function () {
    $response = $this->actingAs($this->user)->post(
        route('projects.issues.comments.store', [
            'project' => $this->project->slug,
            'issue' => $this->group->display_number,
        ]),
        ['body' => '']
    );

    $response->assertSessionHasErrors('body');
    expect($this->group->comments()->count())->toBe(0);
});

it('returns 404 for an unknown issue display number', function () {
    $response = $this->actingAs($this->user)->post(
        route('projects.issues.comments.store', [
            'project' => $this->project->slug,
            'issue' => 999999,
        ]),
        ['body' => 'Should not reach the group.']
    );

    $response->assertNotFound();
});

it('allows the comment owner to delete their comment', function () {
    $comment = IssueComment::create([
        'error_group_id' => $this->group->id,
        'user_id' => $this->user->id,
        'type' => 'comment',
        'body' => 'My comment',
    ]);

    $response = $this->actingAs($this->user)->delete(
        route('projects.issues.comments.destroy', [
            'project' => $this->project->slug,
            'issue' => $this->group->display_number,
            'comment' => $comment->id,
        ])
    );

    $response->assertRedirect();
    expect(IssueComment::find($comment->id))->toBeNull();
});

it('forbids deleting a comment owned by another user', function () {
    $otherUser = User::factory()->create();
    $comment = IssueComment::create([
        'error_group_id' => $this->group->id,
        'user_id' => $otherUser->id,
        'type' => 'comment',
        'body' => 'Their comment',
    ]);

    $response = $this->actingAs($this->user)->delete(
        route('projects.issues.comments.destroy', [
            'project' => $this->project->slug,
            'issue' => $this->group->display_number,
            'comment' => $comment->id,
        ])
    );

    $response->assertForbidden();
    expect(IssueComment::find($comment->id))->not->toBeNull();
});

it('returns 404 when the comment belongs to a different issue', function () {
    $otherGroup = ErrorGroup::factory()->create([
        'project_id' => $this->project->id,
        'display_number' => 43,
    ]);
    $comment = IssueComment::create([
        'error_group_id' => $otherGroup->id,
        'user_id' => $this->user->id,
        'type' => 'comment',
        'body' => 'Wrong issue',
    ]);

    $response = $this->actingAs($this->user)->delete(
        route('projects.issues.comments.destroy', [
            'project' => $this->project->slug,
            'issue' => $this->group->display_number,
            'comment' => $comment->id,
        ])
    );

    $response->assertNotFound();
});
