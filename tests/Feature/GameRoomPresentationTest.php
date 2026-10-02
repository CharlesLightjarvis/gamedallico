<?php

namespace Tests\Feature;

use App\Models\GameWord;
use App\Models\User;
use App\Services\GameRoomEngine;
use App\Support\GameRoomSnapshot;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class GameRoomPresentationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Event::fake();
        Queue::fake();

        GameWord::query()->create([
            'german' => 'bestellen',
            'translations' => ['commander'],
            'strength' => 'faible',
            'third_person_singular' => 'er bestellt',
        ]);
        GameWord::query()->create([
            'german' => 'fahren',
            'translations' => ['conduire'],
            'strength' => 'fort',
            'third_person_singular' => 'er fährt',
        ]);
    }

    public function test_the_server_introduces_the_first_word_before_starting_its_timer(): void
    {
        [$engine, $room] = $this->fullRoom();

        $this->travel(6)->seconds();
        $room = $engine->tick($room);

        $this->assertSame('playing', $room->status);
        $this->assertSame('next_word', $room->presentation);
        $this->assertNotNull($room->presentation_started_at);
        $this->assertNotNull($room->presentation_ends_at);
        $this->assertNull($room->round_ends_at);

        $snapshot = GameRoomSnapshot::make($room);
        $this->assertSame('next_word', $snapshot['room']['presentation']);
        $this->assertNotNull($snapshot['room']['presentation_started_at']);
        $this->assertNotNull($snapshot['room']['presentation_ends_at']);
    }

    public function test_snapshots_expose_a_sub_second_server_clock(): void
    {
        [, $room] = $this->fullRoom();

        $snapshot = GameRoomSnapshot::make($room);

        $this->assertMatchesRegularExpression(
            '/\.\d{6}Z$/',
            $snapshot['server_time'],
        );
    }

    public function test_players_can_probe_the_server_clock_without_mutating_the_room(): void
    {
        [, $room, $host] = $this->fullRoom();
        $version = $room->version;

        $this->actingAs($host)
            ->getJson("/game-rooms/{$room->code}/clock")
            ->assertOk()
            ->assertJsonStructure(['server_time']);

        $this->assertSame($version, $room->fresh()->version);
    }

    public function test_players_cannot_buzz_during_the_server_controlled_word_intro(): void
    {
        [$engine, $room, $host] = $this->fullRoom();

        $this->travel(6)->seconds();
        $room = $engine->tick($room);

        $this->expectException(ValidationException::class);

        $engine->buzz($room, $host);
    }

    public function test_word_timeout_reveal_and_next_word_are_advanced_only_by_the_server(): void
    {
        [$engine, $room] = $this->fullRoom();

        $this->travel(6)->seconds();
        $room = $engine->tick($room);

        $this->travel(3)->seconds();
        $room = $engine->tick($room);
        $this->assertSame('playing', $room->presentation);
        $this->assertNotNull($room->round_ends_at);

        $this->travel(61)->seconds();
        $room = $engine->tick($room);
        $this->assertSame('done', $room->phase);
        $this->assertSame('time_up', $room->presentation);
        $this->assertSame('commander', $room->correction['translation']);
        $this->assertNull($room->round_ends_at);
        $this->assertEquals(
            3,
            $room->presentation_started_at->diffInSeconds(
                $room->presentation_ends_at,
            ),
        );

        $this->travel(5)->seconds();
        $room = $engine->tick($room);
        $this->assertSame('next_word', $room->presentation);
        $this->assertSame(1, $room->word_index);
        $this->assertSame('fahren', $room->currentWord->german);
        $this->assertNull($room->round_ends_at);

        $this->travel(3)->seconds();
        $room = $engine->tick($room);
        $this->assertSame('playing', $room->presentation);
        $this->assertNotNull($room->round_ends_at);
    }

    public function test_a_correct_conjugation_shows_feedback_before_the_result(): void
    {
        [$engine, $room, $host] = $this->fullRoom();

        $this->travel(6)->seconds();
        $room = $engine->tick($room);
        $this->travel(3)->seconds();
        $room = $engine->tick($room);
        $room = $engine->buzz($room, $host);
        $room = $engine->answer($room, $host, 'commander');
        $room = $engine->answer($room, $host, 'faible');
        $room = $engine->answer($room, $host, 'er bestellt');

        $this->assertSame('done', $room->phase);
        $this->assertSame('feedback_correct', $room->presentation);
        $this->assertSame('commander', $room->correction['translation']);
        $this->assertNotNull($room->presentation_ends_at);
        $this->assertEquals(
            1,
            $room->presentation_started_at->diffInSeconds(
                $room->presentation_ends_at,
            ),
        );

        $this->travel(3)->seconds();
        $room = $engine->tick($room);

        $this->assertSame('result', $room->presentation);
        $this->assertEquals(
            3,
            $room->presentation_started_at->diffInSeconds(
                $room->presentation_ends_at,
            ),
        );
    }

    public function test_a_wrong_conjugation_shows_feedback_before_the_correction(): void
    {
        [$engine, $room, $host] = $this->fullRoom();

        $this->travel(6)->seconds();
        $room = $engine->tick($room);
        $this->travel(3)->seconds();
        $room = $engine->tick($room);
        $room = $engine->buzz($room, $host);
        $room = $engine->answer($room, $host, 'commander');
        $room = $engine->answer($room, $host, 'faible');
        $room = $engine->answer($room, $host, 'falsch');

        $this->assertSame('done', $room->phase);
        $this->assertSame('feedback_wrong', $room->presentation);

        $timeline = GameRoomSnapshot::make($room)['room']['presentation_timeline'];
        $this->assertSame('feedback_wrong', $timeline[0]['presentation']);
        $this->assertSame('result', $timeline[1]['presentation']);
        $this->assertSame($timeline[0]['ends_at'], $timeline[1]['starts_at']);

        $this->travel(3)->seconds();
        $room = $engine->tick($room);

        $this->assertSame('result', $room->presentation);
        $this->assertSame('er bestellt', $room->correction['conjugation']);
    }

    public function test_the_last_wrong_translation_shows_feedback_before_the_correction(): void
    {
        [$engine, $room, $host, $guest] = $this->fullRoom();

        $this->travel(6)->seconds();
        $room = $engine->tick($room);
        $this->travel(3)->seconds();
        $room = $engine->tick($room);

        $room = $engine->buzz($room, $host);
        $room = $engine->answer($room, $host, 'mauvaise réponse');
        $this->assertSame('playing', $room->presentation);

        $room = $engine->buzz($room, $guest);
        $room = $engine->answer($room, $guest, 'encore faux');

        $this->assertSame('done', $room->phase);
        $this->assertSame('feedback_wrong', $room->presentation);
        $this->assertEquals(
            1,
            $room->presentation_started_at->diffInSeconds(
                $room->presentation_ends_at,
            ),
        );

        $this->travel(3)->seconds();
        $room = $engine->tick($room);

        $this->assertSame('result', $room->presentation);
        $this->assertSame('commander', $room->correction['translation']);
    }

    public function test_gameplay_history_events_include_the_server_occurrence_time(): void
    {
        [$engine, $room, $host] = $this->fullRoom();

        $this->travel(6)->seconds();
        $room = $engine->tick($room);
        $this->travel(3)->seconds();
        $room = $engine->tick($room);
        $room = $engine->buzz($room, $host);

        $event = collect($room->history)->last();

        $this->assertSame('buzz', $event['type']);
        $this->assertMatchesRegularExpression(
            '/\.\d{6}Z$/',
            $event['occurred_at'],
        );
    }

    public function test_the_last_available_players_timeout_uses_the_time_up_reveal(): void
    {
        [$engine, $room, $host, $guest] = $this->fullRoom();

        $this->travel(6)->seconds();
        $room = $engine->tick($room);
        $this->travel(3)->seconds();
        $room = $engine->tick($room);

        $room = $engine->buzz($room, $host);
        $this->travel(16)->seconds();
        $room = $engine->tick($room);
        $this->assertSame('playing', $room->presentation);

        $room = $engine->buzz($room, $guest);
        $this->travel(16)->seconds();
        $room = $engine->tick($room);

        $this->assertSame('done', $room->phase);
        $this->assertSame('time_up', $room->presentation);
    }

    /**
     * @return array{GameRoomEngine, \App\Models\GameRoom, User, User}
     */
    private function fullRoom(): array
    {
        $engine = app(GameRoomEngine::class);
        $host = User::factory()->create();
        $guest = User::factory()->create();
        $room = $engine->create($host, 2);
        $room = $engine->join($room, $guest);

        return [$engine, $room, $host, $guest];
    }
}
