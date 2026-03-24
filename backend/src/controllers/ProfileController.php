<?php
class ProfileController {
    public static function get() {
        // prototype: return static profile if exists
        $usersFile = __DIR__ . '/../../storage/users.json';
        if (!file_exists($usersFile)) { http_response_code(404); echo json_encode(['error'=>'No user']); return; }
        $users = json_decode(file_get_contents($usersFile), true) ?: [];
        echo json_encode(['user'=>$users[0] ?? null]);
    }

    public static function update() {
        $data = json_decode(file_get_contents('php://input'), true);
        $usersFile = __DIR__ . '/../../storage/users.json';
        if (!file_exists($usersFile)) { http_response_code(404); echo json_encode(['error'=>'No user']); return; }
        $users = json_decode(file_get_contents($usersFile), true) ?: [];
        if (empty($users)) { http_response_code(404); echo json_encode(['error'=>'No user']); return; }
        $users[0]['nom'] = $data['nom'] ?? $users[0]['nom'];
        $users[0]['email'] = $data['email'] ?? $users[0]['email'];
        file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));
        echo json_encode(['user'=>$users[0]]);
    }
}
