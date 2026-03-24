<?php
class HistoryController {
    public static function get($id = null) {
        $analysesFile = __DIR__ . '/../../storage/analyses.json';
        if (!file_exists($analysesFile)) { echo json_encode(['data'=>[]]); return; }
        $analyses = json_decode(file_get_contents($analysesFile), true) ?: [];
        if ($id) {
            foreach ($analyses as $a) if ($a['id']==$id) { echo json_encode($a); return; }
            http_response_code(404); echo json_encode(['error'=>'Not found']);
            return;
        }
        echo json_encode(['data'=>$analyses]);
    }

    public static function delete($id) {
        $analysesFile = __DIR__ . '/../../storage/analyses.json';
        if (!file_exists($analysesFile)) { http_response_code(404); echo json_encode(['error'=>'Not found']); return; }
        $analyses = json_decode(file_get_contents($analysesFile), true) ?: [];
        $new = [];
        $deleted = false;
        foreach ($analyses as $a) {
            if ($a['id'] == $id) { $deleted = true; continue; }
            $new[] = $a;
        }
        if (!$deleted) { http_response_code(404); echo json_encode(['error'=>'Not found']); return; }
        file_put_contents($analysesFile, json_encode($new, JSON_PRETTY_PRINT));
        echo json_encode(['message'=>'Deleted']);
    }
}
