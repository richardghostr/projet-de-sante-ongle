<?php
class AuthController {
    public static function register() {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['email']) || !isset($data['password']) || !isset($data['nom'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing fields']);
            return;
        }

        $email = filter_var($data['email'], FILTER_VALIDATE_EMAIL);
        if (!$email) { http_response_code(400); echo json_encode(['error'=>'Invalid email']); return; }

        $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);

        // Try to insert into DB if available, otherwise store in flat file (prototype)
        global $config;
        $pdo = get_db();
        if ($pdo) {
            $stmt = $pdo->prepare('INSERT INTO users (nom, email, password_hash, created_at) VALUES (?, ?, ?, NOW())');
            try {
                $stmt->execute([$data['nom'], $email, $passwordHash]);
                $id = $pdo->lastInsertId();
                http_response_code(201);
                echo json_encode(['user' => ['id'=>$id,'nom'=>$data['nom'],'email'=>$email]]);
                return;
            } catch (Exception $e) {
                http_response_code(409);
                echo json_encode(['error'=>'Email exists or DB error']);
                return;
            }
        }

        // fallback
        $usersFile = __DIR__ . '/../../storage/users.json';
        $users = [];
        if (file_exists($usersFile)) $users = json_decode(file_get_contents($usersFile), true) ?: [];
        foreach ($users as $u) if ($u['email'] === $email) { http_response_code(409); echo json_encode(['error'=>'Email exists']); return; }
        $id = time();
        $users[] = ['id'=>$id,'nom'=>$data['nom'],'email'=>$email,'password_hash'=>$passwordHash,'created_at'=>date('c')];
        file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));
        http_response_code(201);
        echo json_encode(['user'=>['id'=>$id,'nom'=>$data['nom'],'email'=>$email]]);
    }

    public static function login() {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['email']) || !isset($data['password'])) { http_response_code(400); echo json_encode(['error'=>'Missing fields']); return; }
        $email = filter_var($data['email'], FILTER_VALIDATE_EMAIL);
        if (!$email) { http_response_code(400); echo json_encode(['error'=>'Invalid email']); return; }

        $pdo = get_db();
        if ($pdo) {
            $stmt = $pdo->prepare('SELECT id, nom, email, password_hash FROM users WHERE email = ? LIMIT 1');
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($user && password_verify($data['password'], $user['password_hash'])) {
                // simple token (not secure) for prototype
                $token = base64_encode($user['id'] . ':' . bin2hex(random_bytes(8)));
                echo json_encode(['user'=>['id'=>$user['id'],'nom'=>$user['nom'],'email'=>$user['email']],'token'=>$token]);
                return;
            }
            http_response_code(401); echo json_encode(['error'=>'Invalid credentials']); return;
        }

        // fallback to file
        $usersFile = __DIR__ . '/../../storage/users.json';
        if (!file_exists($usersFile)) { http_response_code(401); echo json_encode(['error'=>'Invalid credentials']); return; }
        $users = json_decode(file_get_contents($usersFile), true) ?: [];
        foreach ($users as $u) {
            if ($u['email'] === $email && password_verify($data['password'], $u['password_hash'])) {
                $token = base64_encode($u['id'] . ':' . bin2hex(random_bytes(8)));
                echo json_encode(['user'=>['id'=>$u['id'],'nom'=>$u['nom'],'email'=>$u['email']],'token'=>$token]);
                return;
            }
        }
        http_response_code(401); echo json_encode(['error'=>'Invalid credentials']);
    }
}
