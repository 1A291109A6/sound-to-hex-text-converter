function init() {
  const fileInput = document.getElementById('fileInput');
  const downloadLink = document.getElementById('downloadLink');
  const loadingText = document.getElementById('loadingText'); // HTMLにこのIDがあることを確認してください

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();

    reader.onload = (event) => {
      if (loadingText) {
        loadingText.style.display = 'block';
      }
      
      const audioContext = new AudioContext();

      // --- 修正点：decodeCallback を OfflineAudioContext を使う処理に変更 ---
      const decodeCallback = (buffer) => {
        
        const targetSampleRate = 8000;
        
        // 1. ターゲットのサンプリングレート（8000Hz）でOfflineAudioContextを作成
        const durationInSeconds = buffer.duration;
        const targetLength = durationInSeconds * targetSampleRate;
        const offlineContext = new OfflineAudioContext(
          buffer.numberOfChannels, // 元のチャンネル数
          targetLength,            // ターゲットの総サンプル数
          targetSampleRate         // ターゲットのレート (8000Hz)
        );

        // 2. オーディオソースを作成
        const source = offlineContext.createBufferSource();
        source.buffer = buffer;

        // 3. ローパスフィルタを作成（アンチエイリアシング）
        //    ターゲットレートのナイキスト周波数 (8000Hz / 2 = 4000Hz) に設定
        const filter = offlineContext.createBiquadFilter();
        filter.type = 'lowpass';
        // Q値（品質係数）を少し下げて、カットオフをなだらかにする（好みで調整可）
        filter.Q.setValueAtTime(0.707, 0); 
        filter.frequency.setValueAtTime(targetSampleRate / 2, 0);
        
        // 4. ノードを接続 (ソース -> フィルタ -> 出力)
        source.connect(filter);
        filter.connect(offlineContext.destination);

        // 5. レンダリング開始 (非同期処理)
        source.start(0);
        
        offlineContext.startRendering().then((resampledBuffer) => {
          // --- ここからは 8000Hz にリサンプリングされたバッファを処理 ---

          const channelData = resampledBuffer.getChannelData(0); 
          let textData = '';
          
          // 既に 8000Hz なので、step は不要 (i++ で全サンプル処理)
          for (let i = 0; i < channelData.length; i++) {
            let floatVal = channelData[i]; 

            if (!isFinite(floatVal)) {
              floatVal = 0.0; 
            }
            floatVal = Math.max(-1.0, Math.min(1.0, floatVal));
            
            const intVal = Math.round(((floatVal + 1.0) * 0.5) * 255);
            const hexVal = intVal.toString(16).padStart(2, '0').toUpperCase();

            textData += hexVal;
          }

          // --- Blob作成とダウンロード処理 ---
          const blob = new Blob([textData], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          downloadLink.href = url;

          const originalName = file.name.split('.').slice(0, -1).join('.');
          downloadLink.download = originalName + '.txt';

          downloadLink.click();
          
          if (loadingText) {
            loadingText.style.display = 'none';
          }
          // --- ここまで ---

        }).catch((err) => {
            console.error('Rendering failed:', err);
            if (loadingText) {
                loadingText.style.display = 'none';
            }
            alert('リサンプリング処理に失敗しました。');
        });
      };
      // --- 修正点ここまで ---


      const errorCallback = (error) => {
        console.error("Error decoding audio data:", error);
        if (loadingText) {
          loadingText.style.display = 'none';
        }
        alert(`ファイルのデコードに失敗しました: ${error.message}`);
      };

      // デコード処理
      switch (file.type) {
        case 'audio/wav':
        case 'audio/mp3':
        case 'audio/mpeg':
        case 'audio/ogg':
        case 'audio/flac':
        case 'audio/x-m4a':
        case 'audio/m4a':
          // audioContext.decodeAudioData は Promise を返さないので、コールバック形式のまま
          audioContext.decodeAudioData(event.target.result, decodeCallback, errorCallback);
          break;
        default:
          errorCallback(new Error(`Unsupported file type: ${file.type}`));
      }
    };

    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        if (loadingText) {
            loadingText.style.display = 'none';
        }
        alert('ファイルの読み込みに失敗しました。');
    };

    reader.readAsArrayBuffer(file);
  });
}

window.onload = init;
