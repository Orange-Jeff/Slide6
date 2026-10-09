<?php
// Simple shared helpers for the Diamond Slide server API
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

function data_dir() {
    $d = __DIR__ . '/game_data';
    if (!file_exists($d)) mkdir($d, 0777, true);
    return $d;
}

function json_response($data) {
    echo json_encode($data, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
    exit;
}

function read_game_file($id) {
    $path = data_dir() . "/game_" . preg_replace('/[^a-z0-9_\-]/i','', $id) . '.json';
    if (!file_exists($path)) return null;
    $raw = file_get_contents($path);
    return json_decode($raw, true);
}

function write_game_file($id, $data) {
    $path = data_dir() . "/game_" . preg_replace('/[^a-z0-9_\-]/i','', $id) . '.json';
    $tmp = $path . '.tmp';
    file_put_contents($tmp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    rename($tmp, $path);
}

function list_games_files() {
    $files = glob(data_dir() . '/game_*.json');
    $out = [];
    foreach ($files as $f) {
        $raw = file_get_contents($f);
        $obj = json_decode($raw, true);
        if ($obj) $out[] = $obj;
    }
    return $out;
}
