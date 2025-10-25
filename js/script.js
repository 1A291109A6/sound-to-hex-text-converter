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

      const decodeCallback = (buffer) => {
        const channelData = buffer.getChannelData(0); 
        let textData = '';
        const samplingRate = buffer.sampleRate;
        const step = samplingRate / 8000; 

        for (let i = 0; i < channelData.length; i += step) {
          let floatVal = channelData[Math.floor(i)]; 

          // --- 修正点 ---

          // 1. 値が NaN や Infinity でないかチェック
          //    isFinite() は有限数（NaNでもInfinityでもない）の場合に true を返す
          if (!isFinite(floatVal)) {
            floatVal = 0.0; // 無効な値は 0.0 (16進数で "80") として扱う
          }

          // 2. 値を -1.0 ～ 1.0 の範囲に確実にクリッピング（切り詰め）
          //    浮動小数点演算の誤差などで範囲外になることを防ぐ
          floatVal = Math.max(-1.0, Math.min(1.0, floatVal));
          
          // --- 修正点ここまで ---


          // -1.0～1.0 の値を 0～255 の整数にマッピング
          // (floatVal + 1.0) -> 0.0 ～ 2.0
          // * 0.5 -> 0.0 ～ 1.0
          // * 255 -> 0 ～ 255
          const intVal = Math.round(((floatVal + 1.0) * 0.5) * 255);

          // 整数を2桁の16進数文字列に変換 (0 -> "00", 255 -> "FF")
          const hexVal = intVal.toString(16).padStart(2, '0').toUpperCase();

          textData += hexVal;
        }

        const blob = new Blob([textData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        downloadLink.href = url;

        const originalName = file.name.split('.').slice(0, -1).join('.');
        downloadLink.download = originalName + '.txt';

        downloadLink.click();
        
        if (loadingText) {
          loadingText.style.display = 'none';
        }
      };

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
