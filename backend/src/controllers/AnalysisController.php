<?php
class AnalysisController {
    public static function uploadImage() {
        // handle multipart/form-data
        if (!isset($_FILES['image'])) { http_response_code(400); echo json_encode(['error'=>'No image uploaded']); return; }
        $f = $_FILES['image'];
        if ($f['error'] !== UPLOAD_ERR_OK) { http_response_code(400); echo json_encode(['error'=>'Upload error']); return; }
        $max = 8 * 1024 * 1024;
        if ($f['size'] > $max) { http_response_code(413); echo json_encode(['error'=>'File too large']); return; }
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $f['tmp_name']);
        finfo_close($finfo);
        $allowed = ['image/jpeg','image/png'];
        if (!in_array($mime, $allowed)) { http_response_code(400); echo json_encode(['error'=>'Invalid image type']); return; }

        $ext = $mime === 'image/png' ? 'png' : 'jpg';
        $name = uniqid('img_') . '.' . $ext;
        $destDir = __DIR__ . '/../../storage/uploads';
        if (!is_dir($destDir)) mkdir($destDir, 0755, true);
        $dest = $destDir . '/' . $name;
        if (!move_uploaded_file($f['tmp_name'], $dest)) { http_response_code(500); echo json_encode(['error'=>'Move failed']); return; }

        // create minimal analysis record (flat file)
        $analysesFile = __DIR__ . '/../../storage/analyses.json';
        $analyses = [];
        if (file_exists($analysesFile)) $analyses = json_decode(file_get_contents($analysesFile), true) ?: [];
        $id = time();
        $record = ['id'=>$id,'user_id'=>null,'image_path'=>'/storage/uploads/'.$name,'result'=>null,'score_confiance'=>null,'niveau_risque'=>null,'date_analyse'=>date('c')];
        $analyses[] = $record;
        file_put_contents($analysesFile, json_encode($analyses, JSON_PRETTY_PRINT));
        http_response_code(201);
        echo json_encode(['analysis_id'=>$id,'status'=>'uploaded','image_url'=>$record['image_path']]);
    }

    public static function analyzeImage() {
        // accept JSON {analysis_id} or multipart with image
        if (!empty($_POST) && isset($_POST['analysis_id'])) $analysis_id = $_POST['analysis_id'];
        else {
            $body = json_decode(file_get_contents('php://input'), true);
            $analysis_id = $body['analysis_id'] ?? null;
        }
        if (!$analysis_id) { http_response_code(400); echo json_encode(['error'=>'analysis_id required']); return; }

        $analysesFile = __DIR__ . '/../../storage/analyses.json';
        if (!file_exists($analysesFile)) { http_response_code(404); echo json_encode(['error'=>'Analysis not found']); return; }
        $analyses = json_decode(file_get_contents($analysesFile), true) ?: [];
        $found = null; foreach ($analyses as $i=>$a) if ($a['id'] == $analysis_id) { $found = &$analyses[$i]; break; }
        if (!$found) { http_response_code(404); echo json_encode(['error'=>'Analysis not found']); return; }

        // Call IA service
        $backendUrl = 'http://ia:8001/predict';
        $imagePath = __DIR__ . '/..' . $found['image_path'];
        if (!file_exists($imagePath)) { http_response_code(500); echo json_encode(['error'=>'Image missing']); return; }

        $ch = curl_init();
        $cfile = curl_file_create($imagePath);
        curl_setopt($ch, CURLOPT_URL, $backendUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, ['image' => $cfile]);
        $resp = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        if ($err) { http_response_code(502); echo json_encode(['error'=>'IA error','detail'=>$err]); return; }

        $result = json_decode($resp, true) ?: ['error'=>'Invalid IA response'];
        $found['result'] = $result;
        $found['score_confiance'] = $result['score'] ?? ($result['predictions'][0]['probability'] ?? 0);
        $found['niveau_risque'] = $found['score_confiance'] > 0.8 ? 'eleve' : ($found['score_confiance'] > 0.5 ? 'modere' : 'bas');
        file_put_contents($analysesFile, json_encode($analyses, JSON_PRETTY_PRINT));

        echo json_encode(['analysis_id'=>$analysis_id,'result'=>$result,'score_confiance'=>$found['score_confiance'],'niveau_risque'=>$found['niveau_risque']]);
    }
}
