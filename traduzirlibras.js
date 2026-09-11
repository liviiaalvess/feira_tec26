let arquivoEstudoAtual = null;
let conteudoArquivoAtual = "";

function mostrarResultadoTransforme(mensagem, tipo = "") {
    const resultado = document.getElementById("resultadoTransforme");

    if (!resultado) return;

    resultado.className = "transforme-result show " + tipo;
    resultado.innerHTML = mensagem;
}

async function extrairTextoDoArquivo(file) {
    const nome = file.name.toLowerCase();

    // TXT
    if (nome.endsWith(".txt")) {
        return await file.text();
    }

    // PDF
    if (nome.endsWith(".pdf")) {
        if (typeof pdfjsLib === "undefined") {
            await carregarScript(
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
            );
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        const arrayBuffer = await file.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer
        }).promise;

        let texto = "";

        for (let pagina = 1; pagina <= pdf.numPages; pagina++) {
            const page = await pdf.getPage(pagina);
            const content = await page.getTextContent();

            texto += content.items
                .map(item => item.str)
                .join(" ");

            texto += "\n\n";
        }

        return texto;
    }

    // DOCX
    if (nome.endsWith(".docx")) {
        if (typeof mammoth === "undefined") {
            await carregarScript(
                "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.9.0/mammoth.browser.min.js"
            );
        }

        const arrayBuffer = await file.arrayBuffer();

        const resultado = await mammoth.extractRawText({
            arrayBuffer: arrayBuffer
        });

        return resultado.value;
    }

    // PPTX
    if (nome.endsWith(".pptx")) {
        if (typeof JSZip === "undefined") {
            await carregarScript(
                "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
            );
        }

        const zip = await JSZip.loadAsync(await file.arrayBuffer());

        let texto = "";

        const arquivos = Object.keys(zip.files)
            .filter(nome =>
                nome.startsWith("ppt/slides/slide") &&
                nome.endsWith(".xml")
            );

        for (const nomeSlide of arquivos) {
            const xml = await zip.files[nomeSlide].async("text");

            const parser = new DOMParser();
            const documento = parser.parseFromString(
                xml,
                "application/xml"
            );

            const textos = documento.getElementsByTagName("a:t");

            for (const elemento of textos) {
                texto += elemento.textContent + " ";
            }

            texto += "\n\n";
        }

        return texto;
    }

    // Imagens
    if (
        nome.endsWith(".png") ||
        nome.endsWith(".jpg") ||
        nome.endsWith(".jpeg")
    ) {
        if (typeof Tesseract === "undefined") {
            await carregarScript(
                "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"
            );
        }

        const resultado = await Tesseract.recognize(
            file,
            "por"
        );

        return resultado.data.text;
    }

    throw new Error("Formato de arquivo não suportado.");
}


function carregarScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");

        script.src = src;

        script.onload = resolve;

        script.onerror = () =>
            reject(
                new Error("Não foi possível carregar o recurso.")
            );

        document.head.appendChild(script);
    });
}


async function obterConteudoEstudo() {
    const inputArquivo =
        document.getElementById("arquivoEstudo");

    const textarea =
        document.getElementById("textoEstudo");

    if (
        inputArquivo &&
        inputArquivo.files &&
        inputArquivo.files.length > 0
    ) {
        arquivoEstudoAtual = inputArquivo.files[0];

        mostrarResultadoTransforme(
            "📖 Lendo o arquivo... Aguarde.",
            "carregando"
        );

        conteudoArquivoAtual =
            await extrairTextoDoArquivo(
                arquivoEstudoAtual
            );

        return conteudoArquivoAtual;
    }

    if (textarea && textarea.value.trim()) {
        conteudoArquivoAtual =
            textarea.value.trim();

        return conteudoArquivoAtual;
    }

    throw new Error(
        "Envie um arquivo ou escreva o conteúdo que deseja estudar."
    );
}


async function transformarEstudo(tipo) {
    try {
        const conteudo =
            await obterConteudoEstudo();

        if (!conteudo || !conteudo.trim()) {
            throw new Error(
                "Não foi encontrado texto no conteúdo enviado."
            );
        }

        // LIBRAS
        if (tipo === "libras") {
            traduzirSomenteArquivoEmLibras(
                conteudo
            );

            return;
        }

        // EXPLICAÇÃO SIMPLES
        if (tipo === "simples") {
            const texto =
                conteudo
                    .replace(/\s+/g, " ")
                    .trim();

            mostrarResultadoTransforme(
                `
                <h3>📖 Explicação simples</h3>
                <p>${escaparHTML(texto)}</p>
                `,
                "sucesso"
            );

            return;
        }

        // RESUMO
        if (tipo === "resumo") {
            const palavras =
                conteudo.split(/\s+/);

            const resumo =
                palavras
                    .slice(0, 120)
                    .join(" ");

            mostrarResultadoTransforme(
                `
                <h3>🎯 Resumo</h3>
                <p>${escaparHTML(resumo)}...</p>
                `,
                "sucesso"
            );

            return;
        }

        // MAPA MENTAL
        if (tipo === "mapa") {
            mostrarResultadoTransforme(
                `
                <h3>🧠 Mapa mental</h3>

                <div class="conteudo-transformado">
                    <strong>Tema principal</strong>

                    <ul>
                        <li>Conceitos importantes</li>
                        <li>Informações principais</li>
                        <li>Exemplos</li>
                        <li>Conclusões</li>
                    </ul>
                </div>
                `,
                "sucesso"
            );

            return;
        }

        // EXERCÍCIOS
        if (tipo === "exercicios") {
            mostrarResultadoTransforme(
                `
                <h3>📝 Exercícios</h3>

                <p>1. Qual é a principal ideia do conteúdo?</p>

                <p>2. Cite dois conceitos importantes apresentados.</p>

                <p>3. Explique o conteúdo com suas próprias palavras.</p>
                `,
                "sucesso"
            );

            return;
        }

        // QUIZ
        if (tipo === "quiz") {
            mostrarResultadoTransforme(
                `
                <h3>❓ Quiz</h3>

                <p><strong>1.</strong> Qual é o principal assunto estudado?</p>

                <button onclick="alert('Resposta registrada!')">
                    Responder
                </button>
                `,
                "sucesso"
            );
        }

    } catch (erro) {
        console.error(erro);

        mostrarResultadoTransforme(
            "❌ " + erro.message,
            "erro"
        );
    }
}


function traduzirSomenteArquivoEmLibras(conteudo) {

    if (!conteudo || !conteudo.trim()) {
        mostrarResultadoTransforme(
            "Não foi possível encontrar conteúdo no arquivo.",
            "erro"
        );

        return;
    }

    const nomeArquivo =
        arquivoEstudoAtual
            ? arquivoEstudoAtual.name
            : "Conteúdo enviado";

    /*
     * Guarda SOMENTE o texto do arquivo.
     * Nenhuma parte da página principal é enviada.
     */
    sessionStorage.setItem(
        "educai_libras_texto",
        conteudo
    );

    sessionStorage.setItem(
        "educai_libras_nome",
        nomeArquivo
    );

    // Vai para a página exclusiva de Libras
    window.location.href = "libras.html";
}


function escaparHTML(texto) {
    const div =
        document.createElement("div");

    div.textContent = texto;

    return div.innerHTML;
}