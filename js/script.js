function init() {
  const fileInput = document.getElementById('fileInput');
  const downloadLink = document.getElementById('downloadLink');
  // loadingText を取得
  const loadingText = document.getElementById('loadingText'); // このIDがHTMLにあるか確認してください

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();

    reader.onload = (event) => {
      // loadingText が存在する場合のみ表示
      if (loadingText) {
        loadingText.style.display = 'block';
      }
      
      const audioContext = new AudioContext();

      // デコード後の処理（コールバック関数）
      const decodeCallback = (buffer) => {
        const channelData = buffer.getChannelData(0); // チャンネル0のデータを取得
        let textData = '';
        const samplingRate = buffer.sampleRate;
        const step = samplingRate / 8000; // 8kHz相当にダウンサンプリング

        for (let i = 0; i < channelData.length; i += step) {
          const floatVal = channelData[Math.floor(i)]; // サンプル値 (-1.0 ～ 1.0)

          // 1. -1.0～1.0 の値を 0～255 の整数にマッピング
          // (floatVal + 1.0) -> 0.0 ～ 2.0
          // ((floatVal + 1.0) / 2.0) -> 0.0 ～ 1.0
          // * 255 -> 0 ～ 255
          const intVal = Math.round(((floatVal + 1.0) / 2.0) * 255);

          // 2. 整数を2桁の16進数文字列に変換 (例: 10 -> "0A", 255 -> "FF")
          //    .toString(16) で16進数に
          //    .padStart(2, '0') で2桁未満の場合に左側を0で埋める
          //    .toUpperCase() で小文字を大文字に (例: "ff" -> "FF")
          const hexVal = intVal.toString(16).padStart(2, '0').toUpperCase();

          // 3. 改行なしで連結
          textData += hexVal;
        }

        // Blobを作成してダウンロード
        const blob = new Blob([textData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        downloadLink.href = url;

        const originalName = file.name.split('.').slice(0, -1).join('.');
        downloadLink.download = originalName + '.txt';

        downloadLink.click();
        
        // loadingText が存在する場合のみ非表示
        if (loadingText) {
          loadingText.style.display = 'none';
        }
      };

      // エラー処理
      const errorCallback = (error) => {
        console.error("Error decoding audio data:", error);
        if (loadingText) {
          loadingText.style.display = 'none';
        }
        alert(`ファイルのデコードに失敗しました: ${error.message}`);
      };

      // サポートされているファイルタイプかチェックし、デコードを実行
      switch (file.type) {
        case 'audio/wav':
        case 'audio/mp3':
        case 'audio/mpeg':
        case 'audio/ogg':
        case 'audio/flac': // FLACもサポートされていることが多い
        case 'audio/x-m4a': // M4A
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