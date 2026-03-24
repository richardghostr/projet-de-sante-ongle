from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import uvicorn
import numpy as np
import cv2
import io

app = FastAPI()

@app.get('/health')
def health():
    return {'status':'ok'}

@app.post('/predict')
async def predict(image: UploadFile = File(...)):
    # prototype stub: read image and return mock predictions
    contents = await image.read()
    npimg = np.frombuffer(contents, np.uint8)
    try:
        img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
    except Exception:
        return JSONResponse(status_code=400, content={'error':'Invalid image'})

    # mock: find mean intensity as dummy score
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    score = float(np.mean(gray) / 255.0)

    response = {
        'predictions': [
            {'label':'onychomycose','probability': round(score, 3)},
            {'label':'psoriasis','probability': round(max(0, score-0.2),3)}
        ],
        'score': round(score,3),
        'mask_url': None,
        'heatmap_url': None,
        'model_version': 'v0.1-stub'
    }
    return response

if __name__ == '__main__':
    uvicorn.run('server:app', host='0.0.0.0', port=8001)
