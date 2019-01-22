'use strict';

const functions = require('firebase-functions');
const http = require('http');
const https = require('https');

// Host para as API's da Fundep
const host = 'hmg6.fundep.ufmg.br';

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((req, res) => {

    console.log(`Request headers: ${JSON.stringify(req.headers)}`);
    console.log(`Request body: ${JSON.stringify(req.body)}`);

    let sessionId = req.body.session.split('sessions/')[1];
    let action = req.body.queryResult.action;
    let fallbackResponse = `Desculpe, mas não compreendi. Se ainda restar alguma dúvida, 
    entre em contato conosco pelo telefone 31 3409-4220. Obrigado!`;

    switch (action) {
        case 'confirmar-matricula.numero-cpf':
            {
                const cpf = req.body.queryResult.parameters.number;
                const path = `/Servicos/ChatBot/api/ExtensaoMatricula/RetornaMatriculaStatus?_CPF=${paddy(cpf, 11)}`;
                
                return Promise.all([getMeuIPPublico(), callFundepAPI(path)])
                    .then((output) => {
                        console.log(`output: ${JSON.stringify(output[1])}`);
                        
                        let result = {
                            fulfillmentText: '',
                            fulfillmentMessages: []
                        };

                        if (output[1].length === 0) {
                            result = {
                                fulfillmentText: 'Desculpe, não encontrei matrículas vinculadas ao seu CPF.',
                                fulfillmentMessages: [{
                                    payload: {
                                        type: "simple_response",
                                        displayText: 'Desculpe, não encontrei matrículas vinculadas ao seu CPF.'
                                    }
                                }]
                            };
                        } else {
                            result = {
                                fulfillmentText: 'Segue a relação de matrículas encontradas:',
                                fulfillmentMessages: [{
                                    payload: {
                                        type: "simple_response",
                                        displayText: 'Segue a relação de matrículas encontradas:'
                                    }
                                }]
                            };
    
                            output[1].forEach(matricula => {
                                result.fulfillmentMessages[result.fulfillmentMessages.length] = {
                                    payload: {
                                        type: "simple_response",
                                        displayText: `${matricula['retornoMatricula']}`
                                    }
                                };
                            });
                        }

                        return res.json(result);

                    }, (error) => {
                        console.log(error);
                        res.json({ fulfillmentText: fallbackResponse });
                    });
            }
        case ('localizar-curso'):
            {
                const nomeCurso = req.body.queryResult.parameters['nome-curso'];

                if (nomeCurso === '' || nomeCurso === null || nomeCurso === undefined) {
                    return res.json({ fulfillmentText: fallbackResponse });
                }

                const path = `/Servicos/ChatBot/api/ExtensaoCae/RetornaCursosAtivos?_Nome=${nomeCurso}`;

                console.log(`Nome-Curso: ${nomeCurso}.`);

                return Promise.all([getMeuIPPublico(), callFundepAPI(path)])
                    .then((output) => {
                        console.log(`output: ${JSON.stringify(output)}.`);

                        if (output[1] === null) {
                            return res.json({ fulfillmentText: fallbackResponse });
                        } else {
                            const cursos = output[1];
                            const result = {
                                fulfillmentText: 'Para informações sobre o curso acesse o(s) link(s) abaixo. Se não encontrar as informações que procura, entre em contato com a coordenação ofertante do curso:',
                                fulfillmentMessages: [{
                                        payload: {
                                            type: 'simple_response',
                                            displayText: 'Para informações sobre o curso acesse o(s) link(s) abaixo. Se não encontrar as informações que procura, entre em contato com a coordenação ofertante do curso:'
                                        }
                                    }
                                ]
                            }

                            cursos.forEach(curso => {
                                result.fulfillmentMessages[result.fulfillmentMessages.length] = {
                                    payload: {
                                        type: 'link_out_chip',
                                        destinationName: `Link ${result.fulfillmentMessages.length}: ${nomeCurso}`,
                                        url: curso.linkCurso
                                    }
                                }
                            });

                            return res.json(result);
                        }
                    }, (error) => {
                        console.log(error);
                        res.json({ fulfillmentText: fallbackResponse });
                    });
            }
        case 'usuario.reset-senha':
            {
                console.log(`outputContexts: ${JSON.stringify(req.body.queryResult.outputContexts[0])}`);
                
                const chave = req.body.queryResult.outputContexts[0].parameters['cpf-matricula.original'];

                console.log(`chave: ${chave}`);

                if (chave === '' || chave === null || chave === undefined) {
                    return res.json({ fulfillmentText: fallbackResponse });
                }

                const path = `/Servicos/ChatBot/api/Usuario/ResetSenha?_Chave=${chave}`;

                return Promise.all([getMeuIPPublico(), callFundepAPI(path)])
                    .then((output) => {
                        console.log(`output: ${JSON.stringify(output)}`);

                        let result = { 
                            fulfillmentText: '',
                            fulfillmentMessages: []
                        }
                        
                        if (output[1] === true) {
                            result.fulfillmentText = 'Seu registro e senha já foram enviados com sucesso para o e-mail.'
                        } else {
                            result.fulfillmentText = 'Entendi, por favor nos envie-nos um e-mail: suporte.extensao@fundep.ufmg.br ou entre em contato através do telefone: 3409-4220.';
                        }
                        
                        return res.json(result);

                    }, (error) => {
                        console.log(error);
                        res.json({ fulfillmentText: fallbackResponse });
                    });
            }
        case 'localizar-curso.descricao':
            {
                const descCurso = req.body.queryResult.parameters['desc-curso'];

                if (descCurso === '' || descCurso === null || descCurso === undefined) {
                    return res.json({ fulfillmentText: fallbackResponse });
                }

                const path = `/Servicos/ChatBot/api/Curso/LocalCurso?_Descricao=${descCurso}`;
                
                return Promise.all([getMeuIPPublico(), callFundepAPI(path)])
                    .then((output) => {
                        console.log(`output: ${JSON.stringify(output)}.`);

                        let result = {
                            fulfillmentText: '',
                            fulfillmentMessages: []
                        };

                        if (output[1].length === 0) {
                            result.fulfillmentText = `Desculpe. Não consegui localizar o curso ${descCurso}.`;

                            result.fulfillmentMessages[0] = {
                                payload: {
                                    type: "simple_response",
                                    displayText: `Desculpe. Não consegui localizar o curso ${descCurso}.`
                                }
                            };
                        } else {
                            result.fulfillmentText = `Encontrei os seguintes cursos baseado na sua pesquisa:`;

                            result.fulfillmentMessages[0] = {
                                payload: {
                                    type: "simple_response",
                                    displayText: `Encontrei os seguintes cursos baseado na sua pesquisa:`
                                }
                            };
    
                            output[1].forEach(curso => {
    
                                result.fulfillmentMessages[result.fulfillmentMessages.length] = {
                                    payload: {
                                        type: "simple_response",
                                        displayText: `${curso.descricao}:`
                                    }
                                };
    
                                result.fulfillmentMessages[result.fulfillmentMessages.length] = {
                                    payload: {
                                        type: "simple_response",
                                        displayText: `${curso.localCurso}`
                                    }
                                };
                            });
                        }                       

                        return res.json(result);
                    }, (error) => {
                        console.log(error);
                        res.json({ fulfillmentText: fallbackResponse });
                    });
            }
        case 'vigencia-projeto':
            {
                const codProjeto = req.body.queryResult.parameters.number;

                if (codProjeto === '' || codProjeto === null || codProjeto === undefined) {
                    return res.json({ fulfillmentText: fallbackResponse });
                }

                const path = `/Servicos/ChatBot/api/projeto/RetornaVigenciaProjeto?_CodProjeto=${codProjeto}`;
                
                return Promise.all([getMeuIPPublico(), callFundepAPI(path)])
                    .then((output) => {

                        let result = {
                            fulfillmentText: '',
                            fulfillmentMessages: []
                        };

                        if (output[1] === null || output[1] === undefined ||output[1].length === 0) {
                            result.fulfillmentText = `As informações sobre a vigência podem ser consultadas na Ficha do Subprojeto, 
                            acessando a ferramenta que fica localizada abaixo do menu ”Pedidos” (cor laranja).
                            Gentileza selecionar o projeto e subprojeto de interesse.`;

                            result.fulfillmentMessages[0] = {
                                payload: {
                                    type: "simple_response",
                                    displayText: `As informações sobre a vigência podem ser consultadas na Ficha do Subprojeto, 
                                    acessando a ferramenta que fica localizada abaixo do menu ”Pedidos” (cor laranja).
                                    Gentileza selecionar o projeto e subprojeto de interesse.`
                                }
                            };
                        } else {
                            if (output[1].vigenciaProjeto === null || output[1].vigenciaProjeto === '' || output[1].vigenciaSubProjeto === null || output[1].vigenciaSubProjeto === '' || output[1].length === 0) {
                                result.fulfillmentText = `As informações sobre a vigência podem ser consultadas na Ficha do Subprojeto, 
                                acessando a ferramenta que fica localizada abaixo do menu ”Pedidos” (cor laranja)
                                Gentileza selecionar o projeto e subprojeto de interesse.`;
    
                                result.fulfillmentMessages[0] = {
                                    payload: {
                                        type: "simple_response",
                                        displayText: `As informações sobre a vigência podem ser consultadas na Ficha do Subprojeto, 
                                        acessando a ferramenta que fica localizada abaixo do menu ”Pedidos” (cor laranja).
                                        Gentileza selecionar o projeto e subprojeto de interesse.`
                                    }
                                };
                            } else {
                                result.fulfillmentText = `As informações sobre a vigência podem ser consultadas na Ficha do Subprojeto, 
                                acessando a ferramenta que fica localizada abaixo do menu ”Pedidos” (cor laranja)`;
    
                                result.fulfillmentMessages[0] = {
                                    payload: {
                                        type: "simple_response",
                                        displayText: `As informações sobre a vigência podem ser consultadas na Ficha do Subprojeto, 
                                        acessando a ferramenta que fica localizada abaixo do menu ”Pedidos” (cor laranja). Para o projeto 
                                        ${codProjeto} encontrei as seguintes vigências:`
                                    }
                                };
    
                                result.fulfillmentMessages[1] = {
                                    payload: {
                                        type: "simple_response",
                                        displayText: output[1][0].vigenciaProjeto
                                    }
                                };
    
                                output[1].forEach(subProjeto => {
                                    result.fulfillmentMessages[result.fulfillmentMessages.length] = {
                                        payload: {
                                            type: "simple_response",
                                            displayText: subProjeto.vigenciaSubProjeto
                                        }
                                    };
                                });
                            }
                        }

                        return res.json(result);
                    }, (error) => {
                        console.log(error);
                        res.json({ fulfillmentText: fallbackResponse });
                    });
            }
        case 'saldo-projeto':
            {
                const codProjeto = req.body.queryResult.parameters.number;

                if (codProjeto === '' || codProjeto === null || codProjeto === undefined) {
                    return res.json({ fulfillmentText: fallbackResponse });
                }

                const path = `/Servicos/ChatBot/api/projeto/RetornaSaldoProjeto?_CodUsuario=${sessionId}&_CodProjeto=${codProjeto}`;

                return Promise.all([getMeuIPPublico(), callFundepAPI(path)])
                    .then((output) => {
                        console.log(`output: ${JSON.stringify(output)}`);

                        let result = {
                            fulfillmentText: '',
                            fulfillmentMessages: []
                        };

                        if (output[1] === null || output[1] === undefined || output[1].length === 0) {
                            result.fulfillmentText = `As informações sobre o saldo disponível podem ser consultadas no extrato do projeto, 
                            acessando a tela inicial do Espaço do Coordenador, selecionando o sub-projeto de execução do coordenador e, 
                            em sequência, clique no nome do projeto. Aparecerá o resumo do projeto.`;

                            result.fulfillmentMessages[0] = {
                                payload: {
                                    type: "simple_response",
                                    displayText: `As informações sobre o saldo disponível podem ser consultadas no extrato do projeto, 
                                    acessando a tela inicial do Espaço do Coordenador, selecionando o sub-projeto de execução do coordenador e, 
                                    em sequência, clique no nome do projeto. Aparecerá o resumo do projeto.`
                                }
                            };
                        } else {
                            result.fulfillmentText = `O saldo para o projeto ${codProjeto} é ${output[1][0].SaldoProjeto}.`;
    
                            result.fulfillmentMessages[0] = {
                                payload: {
                                    type: "simple_response",
                                    displayText: `O saldo para o projeto ${codProjeto} é ${output[1][0].SaldoProjeto}.`
                                }
                            };
    
                            result.fulfillmentMessages[1] = {
                                payload: {
                                    type: "simple_response",
                                    displayText: `As informações sobre o saldo disponível também podem ser consultadas no extrato do projeto, 
                                    acessando a tela inicial do Espaço do Coordenador, selecionando o sub-projeto de execução do coordenador e, 
                                    em sequência, clique no nome do projeto. Aparecerá o resumo do projeto.`
                                }
                            };
                        }

                        return res.json(result);
                    }, (error) => {
                        console.log(error);
                        res.json({ fulfillmentText: fallbackResponse });
                    });
            }
        case 'valor-empenhado':
            {
                const codProjeto = req.body.queryResult.parameters.number;
                
                if (codProjeto === '' || codProjeto === null || codProjeto === undefined) {
                    return res.json({ fulfillmentText: fallbackResponse });
                }

                const path = `/Servicos/ChatBot/api/projeto/RetornaValorEmpenhado?_CodUsuario=${sessionId}&_CodProjeto=${codProjeto}`;

                return Promise.all([getMeuIPPublico(), callFundepAPI(path)])
                    .then((output) => {
                        console.log(`output: ${JSON.stringify(output)}`);

                        let result = {
                            fulfillmentText: '',
                            fulfillmentMessages: []
                        };

                        if (output[1] === null || output[1] === undefined ||output[1].length === 0) {
                            result.fulfillmentText = `As informações sobre os valores empenhados podem ser consultadas no extrato do projeto, 
                            acessando a tela inicial do Espaço do Coordenador, selecionado o sub-projeto de execução do coordenador e, 
                            em sequência, clique no nome do projeto. Aparecerá o resumo do projeto.`;

                            result.fulfillmentMessages[0] = {
                                payload: {
                                    type: "simple_response",
                                    displayText: `As informações sobre os valores empenhados podem ser consultadas no extrato do projeto, 
                                    acessando a tela inicial do Espaço do Coordenador, selecionado o sub-projeto de execução do coordenador e, 
                                    em sequência, clique no nome do projeto. Aparecerá o resumo do projeto.`
                                }
                            };
                        } else {
                            result.fulfillmentText = `O valor empenhado para o projeto ${codProjeto} é ${output[1][0].ValorEmpenhado}.`;
    
                            result.fulfillmentMessages[0] = {
                                payload: {
                                    type: "simple_response",
                                    displayText: `O valor empenhado para o projeto ${codProjeto} é ${output[1][0].ValorEmpenhado}.`
                                }
                            };
    
                            result.fulfillmentMessages[1] = {
                                payload: {
                                    type: "simple_response",
                                    displayText: `As informações sobre o valor empenhado também podem ser consultadas no extrato do projeto, 
                                    acessando a tela inicial do Espaço do Coordenador, selecionando o sub-projeto de execução do coordenador e, 
                                    em sequência, clique no nome do projeto. Aparecerá o resumo do projeto.`
                                }
                            };
                        }

                        return res.json(result);
                    }, (error) => {
                        console.log(error);
                        res.json({ fulfillmentText: fallbackResponse });
                    });
            }
        default:
            {
                console.log('Não achou a action');
                res.json({ fulfillmentText: fallbackResponse });

                break;
            }
    }

    return res;
});

function paddy(num, padlen, padchar) {
    var pad_char = typeof padchar !== 'undefined' ? padchar : '0';
    var pad = new Array(1 + padlen).join(pad_char);
    return (pad + num).slice(-pad.length);
}

function getMeuIPPublico() {
    return new Promise((resolve, reject) => {
        // Cria a variável path para a requisição HTTP para as API's da Fundep
        const url = 'https://api.ipify.org?format=json';
        
        console.log('API Request: ' + host + path);

        // Dispara a requisição HTTP
        https.get(url, (res) => {
            // Variável para armazenar os response chunks
            let body = '';
            
            // Armazena cada response chunk
            res.on('data', (d) => {
                body += d;
            });

            res.on('end', () => {
                // Após todos os dados serem recebidos cria o JSON com os dados desejados
                let response = JSON.parse(body);

                // Resolve o promise com o texto de saída
                console.log(response);
                resolve(response);
            });

            res.on('error', (error) => {
                console.log(`Ocorreu um erro ao contactar a API: ${error}`)
                reject(error);
            });
        });
    });
}

function callFundepAPI(path){
    return new Promise((resolve, reject) => {
        console.log(`host: ${host} path: ${path}`);
        const options = {
            hostname: host,
            port: 80,
            path: encodeURI(path),
            method: 'GET',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Connection': 'keep-alive',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
            }
        };

        let rawData = '';
        
        const request = http.request(options, (response) => {
            
            console.log(`STATUS: ${response.statusCode}`);
            console.log(`HEADERS: ${JSON.stringify(response.headers)}`);

            response.setEncoding('utf8');
            
            response.on('data', (chunk) => {
                console.log(`BODY: ${chunk}`);
                rawData += chunk;
            });
            
            response.on('end', () => {
                let result = null;

                try {
                    result = JSON.parse(rawData);
                } catch (e) {
                    console.log('Erro ao tentar interpretar o corpo da requisição.');
                    console.log(e.message);
                }

                console.log('No more data in response.');

                resolve(result);
            });

            response.on('error', (e) => {
                console.error(`problem with request: ${e.message}`);
            });
        });
                
        // write data to request body
        // req.write();
        request.end();
    });
}
