'use strict';

const functions = require('firebase-functions');
const http = require('http');
const https = require('https');
const { WebhookClient } = require('dialogflow-fulfillment');
const { Text, Card, Image, Suggestion, Payload } = require('dialogflow-fulfillment');

// Host para as API's
const host = '';

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((req, res) => {
    // Instância do client
    const agent = new WebhookClient({
        request: req,
        response: res
    });

    console.log(`Request headers: ${JSON.stringify(req.headers)}`);
    console.log(`Request body: ${JSON.stringify(req.body)}`);

    function respostaSimples(agent) {
        try {
            agent.add('Welcome to the temperature converter!');
        } catch (error) {
            console.error(error);
            fallback(agent);
        }
    }

    function cardBasico(agent) {
        try {
            agent.add('Welcome to the temperature converter!');
            agent.add(new Card({
                title: 'Vibrating molecules',
                imageUrl: 'https://pbs.twimg.com/profile_images/685845249302892544/-AljIPts_400x400.jpg',
                text: 'Did you know that temperature is really just a measure of how fast molecules are vibrating around?! 😱',
                buttonText: 'Temperature Wikipedia Page',
                buttonUrl: 'https://pbs.twimg.com/profile_images/685845249302892544/-AljIPts_400x400.jpg'
            }));
        } catch (error) {
            console.error(error);
            fallback(agent);
        }
    }

    function sugestao(agent) {
        try {
            agent.add('I can convert Celsius to Fahrenheit and Fahrenheit to Celsius! What temperature would you like to convert?');
            agent.add(new Suggestion('27° Celsius'));
            agent.add(new Suggestion('-40° Fahrenheit'));
        } catch (error) {
            console.error(error);
            fallback(agent);
        }
    }
    
    function sugestaoCustom(agent) {
        try {
            console.log(agent.parameters);
            agent.add(`A temperatura é ${agent.parameters.temperature.amount}º ${agent.parameters.temperature.unit}.`);
        } catch (error) {
            console.error(error);
            fallback(agent);
        }
    }

    function paddy(num, padlen, padchar) {
        var pad_char = typeof padchar !== 'undefined' ? padchar : '0';
        var pad = new Array(1 + padlen).join(pad_char);
        return (pad + num).slice(-pad.length);
    }

    function getMeuIPPublico() {
        return new Promise((resolve, reject) => {
            // Cria a variável path para a requisição HTTP para as API's da Fundep
            const url = 'https://api.ipify.org?format=json';

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

    function callAPI(path) {
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

    function fallback(agent) {
        agent.add(`Sinto muito, não consegui entender. Pode repetir?`);
    }

    // Map functions to Dialogflow action names
    let intentMap = new Map(); 
    
    intentMap.set('Resposta Simples', respostaSimples);
    intentMap.set('Card Básico', cardBasico);
    intentMap.set('Sugestoes', sugestao);
    intentMap.set('Sugestoes - custom', sugestaoCustom);

    agent.handleRequest(intentMap);
});
