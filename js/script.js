function init() {
  const fileInput = document.getElementById('fileInput');
  const downloadLink = document.getElementById('downloadLink');
  const loadingText = document.getElementById('loadingText');

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      if (loadingText) loadingText.style.display = 'block';
      
      const audioContext = new AudioContext();

      // メインの処理フロー
      const decodeCallback = async (originalBuffer) => {
        try {
          // =========================================================
          // 【Step 1】 アンチエイリアシング処理
          // 元のサンプリングレートのまま、4kHz以上をカットする
          // =========================================================
          const originalRate = originalBuffer.sampleRate;
          const targetRate = 8000;
          const nyquist = targetRate / 2; // 4000Hz

          // 元と同じ長さ・レートでContext作成
          const filterContext = new OfflineAudioContext(
            originalBuffer.numberOfChannels,
            originalBuffer.length,
            originalRate
          );

          const source = filterContext.createBufferSource();
          source.buffer = originalBuffer;

          // --- エレガントな変形：2段構えフィルタ (Cascade Filtering) ---
          // 1つのフィルタでは傾斜が緩いため、2つ直列に繋いで急峻にカットします。
          // これにより、折り返し雑音の原因となる高周波を徹底的に叩きます。
          const filter1 = filterContext.createBiquadFilter();
          const filter2 = filterContext.createBiquadFilter();

          // 余裕を持って少し低め(3600Hz付近)からカットし始めるか、
          // ButterWorth特性を意識してQ値を調整するのが定石ですが、
          // ここでは「確実に消す」ために4000Hzより少し下を狙います。
          const cutoffFreq = 3800; 

          filter1.type = 'lowpass';
          filter1.frequency.value = cutoffFreq;
          filter1.Q.value = 0.707; // バターワース特性（平坦）

          filter2.type = 'lowpass';
          filter2.frequency.value = cutoffFreq;
          filter2.Q.value = 0.707;

          // 接続: Source -> Filter1 -> Filter2 -> Destination
          source.connect(filter1);
          filter1.connect(filter2);
          filter2.connect(filterContext.destination);

          source.start(0);

          // Step 1 レンダリング実行
          const filteredBuffer = await filterContext.startRendering();


          // =========================================================
          // 【Step 2】 ダウンサンプリング処理
          // 高音がカットされた「安全なデータ」を8000Hzに変換
          // =========================================================
          
          // 新しい持続時間を計算
          const duration = filteredBuffer.duration;
          const targetLength = Math.ceil(duration * targetRate);

          const resampleContext = new OfflineAudioContext(
            1, // Hex化用にモノラルに統一
            targetLength,
            targetRate
          );

          const resampleSource = resampleContext.createBufferSource();
          resampleSource.buffer = filteredBuffer;
          
          // 既にフィルタ済みなので、ここでは何も挟まず出力へ
          resampleSource.connect(resampleContext.destination);
          resampleSource.start(0);

          // Step 2 レンダリング実行
          const finalBuffer = await resampleContext.startRendering();


          // =========================================================
          // 【Step 3】 Hex変換 & ディザリング (前回の提案を含む)
          // =========================================================
          const channelData = finalBuffer.getChannelData(0); 
          let textData = '';
          
          for (let i = 0; i < channelData.length; i++) {
            let floatVal = channelData[i]; 
            if (!isFinite(floatVal)) floatVal = 0.0;
            
            // クリップ
            floatVal = Math.max(-1.0, Math.min(1.0, floatVal));
            
            // 8bit化の前処理
            const scaled = (floatVal + 1.0) * 0.5 * 255;
            
            // TPDFディザリング（量子化ノイズ低減）
            const dither = Math.random() - Math.random();
            const intVal = Math.round(scaled + dither);
            
            const finalVal = Math.max(0, Math.min(255, intVal));
            const hexVal = finalVal.toString(16).padStart(2, '0').toUpperCase();
            textData += hexVal;
          }

          // ダウンロード処理
          const blob = new Blob([textData], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          downloadLink.href = url;
          const originalName = file.name.split('.').slice(0, -1).join('.');
          downloadLink.download = originalName + '_8k_filtered.txt';
          downloadLink.click();
          
          if (loadingText) loadingText.style.display = 'none';

        } catch (err) {
          console.error(err);
          if (loadingText) loadingText.style.display = 'none';
          alert('処理中にエラーが発生しました');
        }
      };

      const errorCallback = (error) => {
        console.error(error);
        if (loadingText) loadingText.style.display = 'none';
        alert('デコードエラー');
      };

      // デコード開始
      audioContext.decodeAudioData(event.target.result, decodeCallback, errorCallback);
    };

    reader.readAsArrayBuffer(file);
  });
}

window.onload = init;
