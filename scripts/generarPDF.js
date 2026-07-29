// Gera PDF a partir do elemento .container usando html2canvas + jsPDF
// Requer:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

(async function () {
  window.generarPDF = async function generarPDF(filename = 'duplicata.pdf') {
    try {
      const element = document.querySelector('.container');
      if (!element) throw new Error('Elemento .container não encontrado.');

      // Desfoca inputs focados para evitar caret visível no screenshot
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }

      // opções para html2canvas
      const scale = Math.min(2, (window.devicePixelRatio || 1)); // aumentar para melhor qualidade
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true, // tenta carregar imagens cross-origin via CORS
        logging: false,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');

      // acessar jsPDF via UMD
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');

      // medidas
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // dimensões da imagem em mm
      const pxToMm = (px) => (px * 25.4) / (96 * scale); // assume 96dpi base
      const imgWidthMm = pxToMm(canvas.width);
      const imgHeightMm = pxToMm(canvas.height);

      // escala para ajustar largura da página
      const ratio = Math.min(pdfWidth / imgWidthMm, 1);
      const renderWidth = imgWidthMm * ratio;
      const renderHeight = imgHeightMm * ratio;

      // se couber em uma página
      if (renderHeight <= pdfHeight) {
        pdf.addImage(imgData, 'PNG', (pdfWidth - renderWidth) / 2, 10, renderWidth, renderHeight);
        pdf.save(filename);
        return;
      }

      // multi-página: renderizamos por fatias verticais usando canvas temporário
      const pageHeightPx = Math.floor((pdfHeight / ratio) * (96 * scale) / 25.4); // página em px no canvas original
      let remainingHeightPx = canvas.height;
      let pageYOffset = 0;

      while (remainingHeightPx > 0) {
        // cria canvas temporário com a altura da página em px (ou o resto)
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = canvas.width;
        tmpCanvas.height = Math.min(pageHeightPx, remainingHeightPx);
        const tmpCtx = tmpCanvas.getContext('2d');

        // desenha a fatia do canvas original
        tmpCtx.drawImage(
          canvas,
          0, pageYOffset, // origem (x,y)
          canvas.width, tmpCanvas.height, // tamanho origem
          0, 0, // destino
          canvas.width, tmpCanvas.height // tamanho destino
        );

        const tmpImgData = tmpCanvas.toDataURL('image/png');
        const tmpImgHeightMm = pxToMm(tmpCanvas.height) * ratio;

        if (pageYOffset > 0) pdf.addPage();
        pdf.addImage(tmpImgData, 'PNG', (pdfWidth - renderWidth) / 2, 10, renderWidth, tmpImgHeightMm);

        // avançar
        remainingHeightPx -= tmpCanvas.height;
        pageYOffset += tmpCanvas.height;
      }

      pdf.save(filename);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF: ' + (err.message || err));
    }
  };
})();
