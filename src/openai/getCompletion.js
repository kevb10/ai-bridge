/**
 * The following script is used to ask a prompt, and return its completion response
 * 
 * This does not perform any caching / saving, and can be imported, or executed directly
 **/

// Load dependency modules, and keys
const fetch = require("node-fetch");
const GPT3Tokenizer = require('gpt3-tokenizer').default;

// Default config settings to use
const defaultConfig = {
	"model": "text-davinci-003",
	"temperature": 0,
    "total_tokens": 4090,
	"max_tokens": null,
	"top_p": 1,
	"frequency_penalty": 0,
	"presence_penalty": 0,
	"best_of": 1,

	// Important note!: we split the endoftext token very
	// intentionally,to avoid causing issues when this file is parsed
	// by GPT-3 based AI.

	// Default stop keyword
	"stop": ["<|"+"endoftext"+"|>"],

	// Default prompt
	"prompt": "<|"+"endoftext"+"|>",

	// Return as a string if false, 
	// else return the raw openAI API response
	"rawApi": false
};

// Initialize the tokenizer
const tokenizer = new GPT3Tokenizer({ type: 'gpt3' });

/**
 * Given the prompt config, return the API result
 * 
 * @param {String} openai_key, apikey for the request
 * @param {String | Object} inConfig, containing the prompt or other properties
 * @param {Function} streamListener, for handling streaming requests
 * @param {String} completionURL to use
 * 
 * @return {Sring | Object} completion string, if rawApi == false (default), else return the raw API JSON response
 */
async function getCompletion(
    openai_key, inConfig, 
    streamListener = null, 
    completionURL = 'https://api.openai.com/v1/completions'
) {
	// Normalzied string prompt to object
	if (typeof inConfig === 'string' || inConfig instanceof String) {
		inConfig = { prompt: inConfig };
	}
	// Safety
	if( streamListener == null ) {
		streamListener = () => {};
	}

	// Join it together
	let reqJson = Object.assign({}, defaultConfig, inConfig);

	// Extract and remove internal props
	let useRawApi = reqJson.rawApi || false;
	delete reqJson.rawApi;

	// Normalize "max_tokens" auto
	if( reqJson.max_tokens == "auto" || reqJson.max_tokens == null ) {
        let totalTokens = inConfig.total_tokens || 4090;
		let tokenObj = tokenizer.encode( reqJson.prompt );
		reqJson.max_tokens = totalTokens - tokenObj.bpe.length;
		if( reqJson.max_tokens <= 50 ) {
			throw `Prompt is larger or nearly equal to total token count (${tokenObj.bpe.length}/${totalTokens})`;
		}
	}

	// The return data to use
	let respJson = null;
	let respErr = null;

	// Decide on how to handle streaming, or non streaming event
    if(reqJson.stream != true) {

        // Non streaming request handling
		//----------------------------------
        for(let tries=0; tries < 2; ++tries) {
            try {
                // Perform the JSON request
                const resp = await fetch(completionURL, {
                    method: 'post',
                    body: JSON.stringify(reqJson),
                    headers: {
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${openai_key}`
                    }
                });
                respJson = await resp.json();
        
                // Check for response
                if( respJson.choices && respJson.choices[0] && respJson.choices[0].text ) {
                    // Return the JSON as it is
                    if( useRawApi ) {
                        return respJson;
                    }
        
                    // Return the completion in simple mode
					let finalStr = respJson.choices[0].text.trim();
					streamListener(finalStr)
                    return finalStr;
                }
            } catch(e) {
                respErr = e;
            }
        }
    } else {

        // Streaming request handling
		//----------------------------------

		// Perform the initial streaming request request
		const resp = await fetch(completionURL, {
			method: 'post',
			body: JSON.stringify(reqJson),
			headers: {
				'Content-Type': 'application/json',
				"Authorization": `Bearer ${openai_key}`
			}
		});

		// Event based error handling block
		try {
			// Start streaming the result asyncronously
			// and return the full result
			// ---

			// Get the raw API response reader
			const reader = resp.body.getReader();

			// Raw buffer, and the parsed result
			let rawBuffer = "";
			let parsedRes = "";

			// Text encoder to use
			const decoder = new TextDecoder();

			// Lets do a while loop, till conditions are met
			while( true ) {

				// Read the value, and done status of the chunk
				const { value, done } = await reader.read();

				// Push into the raw buffer
				if( value ) {
					rawBuffer += decoder.decode(value);
				}

				// Remove starting new line in a stream
				while( rawBuffer.startsWith("\n") ) {
					rawBuffer = rawBuffer.slice(1);
				}

				// Postion tracker
				let doubleNL_pos = -1;

				// Check for double new line, which is the dataEvent terminator
				while( (doubleNL_pos = rawBuffer.indexOf("\n\n")) > 0 ) {
					// Get the dataEvent
					const dataEvent = rawBuffer.slice(0, doubleNL_pos).trim();

					// Remove dataEvent and double new line from raw buffer
					rawBuffer = rawBuffer.slice(doubleNL_pos+2);

					// Forward any errors
					if(dataEvent.startsWith("error:")) {
						throw `Unexpected stream request error: ${dataEvent.slice(6)}`
					}

					// Does nothing for "[DONE]" dataEvent,
					if(dataEvent.startsWith("data: [DONE]")) {
						continue;
					}

					// Lets process the dataEvent data object
					if(dataEvent.startsWith("data: {")) {
						// Process the json data
						const dataJson = dataEvent.slice(6).trim();
						const dataObj = JSON.parse( dataJson );

						// Get the token
						const strToken = dataObj.choices[0].text;

						// Add it to the parsedRes
						parsedRes += strToken;

						// Stream the token back as an event
						await streamListener(strToken);
						continue;
					}
					
					// Throw unexpected dataEvent format
					console.warn("Unexpected data event format", dataEvent)
					throw "Unexpected data event format, see warning logs"
				}

				// Break on completion
				if( value == null || done ) {
					break;
				}
			}

			// Unexpected end of stream error
			let trimRawBuffer = rawBuffer.trim();
			if(trimRawBuffer.length > 0 ) {
				console.warn("Unexpected end of stream, with unprocessed data", trimRawBuffer)
				throw "Unexpected end of stream, with unprocessed data, see warning logs for more details";
			}

			// Return the full string
			return parsedRes;
		} catch (e) {
			console.warn("Unexpected event processing error", e)
			throw "Unexpected event processing error, see warning logs for more details";
		} finally {
			writer.close();
		}
    }

	// Handle unexpected response
	if( respErr ) {
		console.warn([
			"## Unable to handle prompt for ...",
			JSON.stringify(reqJson),
			"## Recieved error ...",
			respErr
		].join("\n"));
	} else {
		console.warn([
			"## Unable to handle prompt for ...",
			JSON.stringify(reqJson),
			"## Recieved response ...",
			JSON.stringify(respJson)
		].join("\n"));
	}
	throw Error("Missing valid openai response, please check warn logs for more details")
}

// Export the module
module.exports = getCompletion;
