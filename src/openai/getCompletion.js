/**
 * The following script is used to ask a prompt, and return its completion response
 * 
 * This does not perform any caching / saving, and can be imported, or executed directly
 **/

const getChatCompletion = require("./getChatCompletion");

// Default config settings to use
const defaultConfig = {
	"model": "gpt-3.5-turbo",
	"temperature": 0,

	"total_tokens": 4080,
	"max_tokens": null,

	"top_p": 1,
	"frequency_penalty": 0,
	"presence_penalty": 0,

	// NOTE this is not supported in gpt-3.5-turbo onwards
	// "best_of": 1,

	// Important note!: we split the endoftext token very
	// intentionally,to avoid causing issues when this file is parsed
	// by GPT-3 based AI.

	// // Default stop keyword
	// "stop": ["<|"+"endoftext"+"|>"],

	// // Default prompt
	// "prompt": "<|"+"endoftext"+"|>",

	// Return as a string if false, 
	// else return the raw openAI API response
	"rawApi": false
};

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
	completionURL = 'https://api.openai.com/v1/completions', 
	chatCompletionURL = 'https://api.openai.com/v1/chat/completions'
) {
	console.warn("getCompletion is deprecated, use getChatCompletion instead");
	return getChatCompletion(openai_key, inConfig, streamListener, chatCompletionURL);
}

// Export the module
module.exports = getCompletion;
