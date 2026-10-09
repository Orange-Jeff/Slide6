<?php
// Version 3.4 - All games expire after 1 hour, no more months-old games
require_once __DIR__ . '/common.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = '';

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = isset($input['action']) ? $input['action'] : '';
} else {
    $action = isset($_GET['action']) ? $_GET['action'] : '';
}

// --- Helper Functions ---

function generate_secret() {
    return bin2hex(random_bytes(16));
}
function generate_codeword() {
    $words1 = ['Tardis', 'Warp', 'Spock', 'Dalek', 'Cyberman', 'Sonic', 'Phaser', 'Photon', 'Matrix', 'Holodeck', 'Replicant', 'Stargate', 'Hyperdrive', 'Lightsaber', 'Jedi', 'Sith', 'Blaster', 'Droid', 'Flux', 'Capacitor', 'Vortex', 'Marvin', 'Zaphod', 'Trillian', 'Slartibartfast'];
    $words2 = ['Vader', 'Beeblebrox', 'Kirk', 'Picard', 'Ford', 'Android', 'Tribble', 'GLaDOS', 'HAL', 'Skynet', 'Terminator', 'Xenomorph', 'Predator', 'Wookiee', 'Ewok', 'Cylon', 'Morpheus', 'Neo', 'Trinity', 'Deckard', 'Manipulator', 'Pan-Galactic', 'Gargle-Blaster'];
    $word1 = $words1[array_rand($words1)];
    $word2 = $words2[array_rand($words2)];
    return "$word1 $word2";
}

function save_join_request($gameId, $playerName, $type) {
    $data_dir = __DIR__ . '/game_data';
    if (!is_dir($data_dir)) mkdir($data_dir, 0755, true);

    $requestId = uniqid();
    $request = [
        'id' => $requestId,
        'gameId' => $gameId,
        'playerName' => $playerName,
        'type' => $type, // 'join' or 'watch'
        'timestamp' => time()
    ];

    $requests_file = $data_dir . '/requests.json';
    $requests = [];
    if (file_exists($requests_file)) {
        $requests = json_decode(file_get_contents($requests_file), true) ?: [];
    }

    $requests[] = $request;
    file_put_contents($requests_file, json_encode($requests, JSON_PRETTY_PRINT));
    return $requestId;
}

function get_join_requests() {
    $data_dir = __DIR__ . '/game_data';
    $requests_file = $data_dir . '/requests.json';
    if (!file_exists($requests_file)) return [];

    $requests = json_decode(file_get_contents($requests_file), true) ?: [];

    // Add game names to requests
    foreach ($requests as &$request) {
        $game = read_game_file($request['gameId']);
        $request['gameName'] = $game ? $game['name'] : 'Unknown Game';
    }

    return $requests;
}

function remove_join_request($requestId) {
    $data_dir = __DIR__ . '/game_data';
    $requests_file = $data_dir . '/requests.json';
    if (!file_exists($requests_file)) return false;

    $requests = json_decode(file_get_contents($requests_file), true) ?: [];
    $requests = array_filter($requests, function($req) use ($requestId) {
        return $req['id'] !== $requestId;
    });

    file_put_contents($requests_file, json_encode(array_values($requests), JSON_PRETTY_PRINT));
    return true;
}

switch ($action) {
    case 'list':
        $data_dir = __DIR__ . '/game_data';
        $now = time();
        $waiting_timeout = 600; // 10 minutes
        $stale_game_timeout = 3600; // 1 hour - games expire after 1 hour of inactivity

        $all_games = list_games_files();
        $waiting_games = [];
        $active_games = [];

        foreach ($all_games as $game) {
            // Cleanup new, unjoined rooms after 10 minutes
            if ($game['status'] === 'waiting' && ($now - $game['createdAt']) > $waiting_timeout) {
                $pathf = $data_dir . '/game_' . preg_replace('/[^a-z0-9_\-]/i','', $game['id']) . '.json';
                if (file_exists($pathf)) {
                    unlink($pathf);
                }
                continue; // Skip this expired waiting game
            }

            // V3.4: Cleanup ALL games older than 1 hour (prevents months-old games)
            $gameAge = $now - $game['createdAt'];
            if ($gameAge > $stale_game_timeout) {
                $pathf = $data_dir . '/game_' . preg_replace('/[^a-z0-9_\-]/i','', $game['id']) . '.json';
                if (file_exists($pathf)) {
                    unlink($pathf);
                }
                continue; // Skip this stale game
            }

            // All games are now public and listable

            // Sort into lists
            if ($game['status'] === 'waiting') {
                $waiting_games[] = $game;
            } else {
                $active_games[] = $game;
            }
        }
        json_response(['ok' => true, 'waiting' => $waiting_games, 'active' => $active_games]);
        break;

    case 'create':
        $input = json_decode(file_get_contents('php://input'), true);
        $name = isset($input['name']) && !empty($input['name']) ? $input['name'] : ('Room ' . rand(100, 999));
        $connectN = isset($input['connectN']) ? intval($input['connectN']) : 4;

        $id = 'g' . time() . rand(100,999);
        $p1_secret = generate_secret();

        $game = [
            'id' => $id,
            'name' => $name,
            'connectN' => $connectN,
            'players' => [ 'p1' => [ 'id' => 'p1', 'name' => 'Orange', 'side' => 0, 'present' => true ] ],
            'playerSecrets' => [ 'p1' => $p1_secret ],
            'watchers' => [], // New field for watchers
            'status' => 'waiting', // waiting, active
            'board' => array_fill(0, 6, array_fill(0, 6, null)),
            'currentPlayer' => 0,
            'turnNumber' => 0,
            'score' => ['orange' => 0, 'blue' => 0],
            'createdAt' => time(),
            'lastUpdated' => time()
        ];
        write_game_file($id, $game);
        json_response(['ok' => true, 'game' => $game, 'playerSecret' => $p1_secret]);
        break;

    case 'request_join':
        $input = json_decode(file_get_contents('php://input'), true);
        $gameId = isset($input['gameId']) ? $input['gameId'] : null;
        $playerName = isset($input['playerName']) ? trim($input['playerName']) : '';
        $type = isset($input['type']) ? $input['type'] : 'watch'; // 'join' or 'watch'

            if (!$gameId) {
                json_response(['ok' => false, 'error' => 'Game ID required']);
            }

        $game = read_game_file($gameId);
        if (!$game) json_response(['ok' => false, 'error' => 'Game not found']);

    $requestId = save_join_request($gameId, ($playerName ? $playerName : 'Watcher'), $type);
        json_response(['ok' => true, 'requestId' => $requestId]);
        break;

    case 'join_now':
        // Immediate join without approval: assign player role or watcher and return secret
        $input = json_decode(file_get_contents('php://input'), true);
        $gameId = isset($input['gameId']) ? $input['gameId'] : null;
    $playerName = isset($input['playerName']) ? trim($input['playerName']) : '';
        $type = isset($input['type']) ? $input['type'] : 'join';
    if (!$gameId) json_response(['ok' => false, 'error' => 'Game ID required']);
        $game = read_game_file($gameId);
        if (!$game) json_response(['ok' => false, 'error' => 'Game not found']);

        // Ensure players array exists
        if (!isset($game['players'])) $game['players'] = [];
        if (!isset($game['playerSecrets'])) $game['playerSecrets'] = [];

        // If asking to join as player and there's a free slot, assign p1 or p2
        if ($type === 'join') {
            // Find existing player slots
            $hasP1 = isset($game['players']['p1']);
            $hasP2 = isset($game['players']['p2']);

            if (!$hasP1) {
                $pid = 'p1';
            } elseif (!$hasP2) {
                $pid = 'p2';
            } else {
                // No player slots available, add as watcher
                $pid = null;
            }

            if ($pid) {
                $p_secret = generate_secret();
                // Add or update player entry
                $game['players'][$pid] = [ 'id' => $pid, 'name' => ($playerName ? $playerName : ($pid === 'p1' ? 'Orange' : 'Blue')), 'side' => ($pid === 'p1' ? 0 : 1), 'present' => true ];
                $game['playerSecrets'][$pid] = $p_secret;
                // If both players present, mark active
                if (isset($game['players']['p1']) && isset($game['players']['p2'])) {
                    $game['status'] = 'active';
                }
                $game['lastUpdated'] = time();
                write_game_file($game['id'], $game);
                json_response(['ok' => true, 'role' => $pid, 'playerSecret' => $p_secret, 'game' => $game]);
            } else {
                // add as watcher
                if (!isset($game['watchers'])) $game['watchers'] = [];
                $game['watchers'][] = ['name' => ($playerName ? $playerName : 'Watcher'), 'joinedAt' => time()];
                $game['lastUpdated'] = time();
                write_game_file($game['id'], $game);
                json_response(['ok' => true, 'role' => 'watch', 'game' => $game]);
            }
        } else {
            // type === 'watch'
            if (!isset($game['watchers'])) $game['watchers'] = [];
            $game['watchers'][] = ['name' => $playerName, 'joinedAt' => time()];
            $game['lastUpdated'] = time();
            write_game_file($game['id'], $game);
            json_response(['ok' => true, 'role' => 'watch', 'game' => $game]);
        }
        break;

    case 'get_requests':
        $requests = get_join_requests();
        json_response(['ok' => true, 'requests' => $requests]);
        break;

    case 'approve_request':
        $input = json_decode(file_get_contents('php://input'), true);
        $requestId = isset($input['requestId']) ? $input['requestId'] : null;
        $approve = isset($input['approve']) ? $input['approve'] : false;

        if (!$requestId) {
            json_response(['ok' => false, 'error' => 'Request ID required']);
        }

        // Find the request
        $requests = get_join_requests();
        $request = null;
        foreach ($requests as $req) {
            if ($req['id'] === $requestId) {
                $request = $req;
                break;
            }
        }

        if (!$request) {
            json_response(['ok' => false, 'error' => 'Request not found']);
        }

        if ($approve) {
            $game = read_game_file($request['gameId']);
            if (!$game) {
                json_response(['ok' => false, 'error' => 'Game not found']);
            }

            if ($request['type'] === 'join' && !isset($game['players']['p2'])) {
                // Add as player
                $pid = 'p2';
                $p2_secret = generate_secret();
                $game['players']['p2'] = [ 'id' => $pid, 'name' => $request['playerName'], 'side' => 1 ];
                $game['playerSecrets'][$pid] = $p2_secret;
                $game['status'] = 'active';
                $game['lastUpdated'] = time();
                write_game_file($game['id'], $game);

                remove_join_request($requestId);
                $gameUrl = $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . "/../game.html?server=" . urlencode($_SERVER['REQUEST_URI']) . "&id=" . urlencode($game['id']) . "&secret=" . urlencode($p2_secret);
                json_response(['ok' => true, 'gameUrl' => $gameUrl, 'playerSecret' => $p2_secret]);
            } else {
                // Add as watcher
                if (!isset($game['watchers'])) $game['watchers'] = [];
                $game['watchers'][] = ['name' => $request['playerName'], 'joinedAt' => time()];
                $game['lastUpdated'] = time();
                write_game_file($game['id'], $game);

                remove_join_request($requestId);
                $gameUrl = $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . "/../game.html?server=" . urlencode($_SERVER['REQUEST_URI']) . "&id=" . urlencode($game['id']);
                json_response(['ok' => true, 'gameUrl' => $gameUrl]);
            }
        } else {
            // Deny request
            remove_join_request($requestId);
            json_response(['ok' => true]);
        }
        break;

    case 'get':
        $id = isset($_GET['id']) ? $_GET['id'] : '';
        if (!$id) json_response(['ok' => false, 'error' => 'Missing game ID']);
        $game = read_game_file($id);
        if (!$game) json_response(['ok' => false, 'error' => 'Game not found']);

        if (isset($game['playerSecrets'])) {
            unset($game['playerSecrets']);
        }
        json_response(['ok' => true, 'game' => $game]);
        break;

    case 'move':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!isset($input['id'], $input['turnNumber'], $input['playerId'], $input['board'], $input['playerSecret'])) {
            json_response(['ok' => false, 'error' => 'Missing required fields for move']);
        }
        $game = read_game_file($input['id']);
        if (!$game) json_response(['ok' => false, 'error' => 'Game not found']);

        if (!isset($game['playerSecrets'][$input['playerId']]) || $game['playerSecrets'][$input['playerId']] !== $input['playerSecret']) {
            json_response(['ok' => false, 'error' => 'Invalid player secret']);
        }

        if ($input['turnNumber'] != $game['turnNumber']) {
            json_response(['ok' => false, 'error' => 'Stale turn', 'game' => $game]);
        }

        $game['board'] = $input['board'];
        $game['turnNumber'] = $game['turnNumber'] + 1;
        $game['currentPlayer'] = $input['currentPlayer'];
        $game['lastUpdated'] = time();
        write_game_file($game['id'], $game);
        json_response(['ok' => true, 'game' => $game]);
        break;

    case 'report_win':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!isset($input['id'], $input['winner'], $input['playerSecret'])) json_response(['ok' => false, 'error' => 'Missing fields']);
        $game = read_game_file($input['id']);
        if (!$game) json_response(['ok' => false, 'error' => 'Game not found']);

        // A player must have a secret to report a win
        $player_id = array_search($input['playerSecret'], $game['playerSecrets']);
        if ($player_id === false) json_response(['ok' => false, 'error' => 'Invalid player secret']);

        if ($input['winner'] === 'orange') {
            $game['score']['orange']++;
        } elseif ($input['winner'] === 'blue') {
            $game['score']['blue']++;
        }
        $game['lastUpdated'] = time();
        write_game_file($game['id'], $game);
        json_response(['ok' => true, 'game' => $game]);
        break;

    case 'reset_round':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!isset($input['id'], $input['playerSecret'])) json_response(['ok' => false, 'error' => 'Missing fields']);
        $game = read_game_file($input['id']);
        if (!$game) json_response(['ok' => false, 'error' => 'Game not found']);

        $player_id = array_search($input['playerSecret'], $game['playerSecrets']);
        if ($player_id === false) json_response(['ok' => false, 'error' => 'Invalid player secret']);

        // Reset board and turn state, keep scores and players
        $game['board'] = array_fill(0, 6, array_fill(0, 6, null));
        $game['currentPlayer'] = 0;
        $game['turnNumber'] = 0;
        $game['lastUpdated'] = time();
        write_game_file($game['id'], $game);
        json_response(['ok' => true, 'game' => $game]);
        break;

    case 'admin_reset':
        if ($method !== 'POST') {
            json_response(['ok' => false, 'error' => 'Invalid method']);
        }

        // V3.3 - Require password for admin reset
        $input = json_decode(file_get_contents('php://input'), true);
        $password = isset($input['password']) ? $input['password'] : '';
        if ($password !== 'xyzzy') {
            json_response(['ok' => false, 'error' => 'Invalid admin password']);
        }

        $data_dir = __DIR__ . '/game_data';
        $files = glob($data_dir . '/game_*.json');
        $count = 0;
        foreach ($files as $file) {
            if (unlink($file)) {
                $count++;
            }
        }
        json_response(['ok' => true, 'message' => 'All game files have been deleted.', 'files_reset' => $count]);
        break;

    default:
        json_response(['ok' => false, 'error' => 'Unknown action']);
        break;
}
