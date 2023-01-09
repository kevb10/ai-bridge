//------------------------------------------------------------------
// Dependencies
//------------------------------------------------------------------

const { MongoClient } = require('mongodb');
const jsonStringify = require('fast-json-stable-stringify');

//------------------------------------------------------------------
// Utility function
//------------------------------------------------------------------

/**
 * Given the type and cacheObj, get the full collection name
 */
function getCacheCollectionName(type, cacheObj) {
	return type + '_' + cacheObj.promptOpt.model;
}

//------------------------------------------------------------------
// Implementation
//------------------------------------------------------------------

/**
 * # MongoDB Cache context
 * 
 * NOTE: This is not designed to be used directly, and is meant to be used with LayerCache instance
 * 
 * Provides a mongodb based cache, which can be shared with multiple team members.
 * 
 * # MongoDBCache collection structure
 * 
 * {completion|embedding}_{model-name}
 */
 class MongoDBCache {

	/**
	 * Setup with the mongoDB URL
	 */
	constructor(mongoURL) {
		this.mongoClient = new MongoClient(mongoURL);
	}

	/** 
	 * Does any async based setup, which might be required
	 */
	async setup() {
		await this.mongoClient.connect();
	}

	/**
	 * Given the cacheObj, search and get the completion record in cache.
	 */
	async getCacheCompletion(cacheObj) {
		// Get the collection name
		let collectionName = getCacheCollectionName("completion", cacheObj);

		// Connect to the collection
		let collection = this.mongoClient.db().collection(collectionName);

		// Search for the record
		let record = await collection.findOne({
			// We use a hash based lookup, as its the most efficent
			hash: cacheObj.hash,

			// Followed by tempkey
			tempKey: cacheObj.tempKey,

			// And the actual prompt
			prompt: cacheObj.prompt,

			// And finally the option for the prompt
			opt: cacheObj.cleanOpt
		});

		// And return
		if(record) {
			return record.completion;
		} else {
			return null;
		}
	}

	/**
	 * Given the cacheObj, add the completion record into cache
	 */
	async addCacheCompletion(cacheObj, completion) {
		// Get the collection name
		let collectionName = getCacheCollectionName("completion", cacheObj);

		// Connect to the collection
		let collection = this.mongoClient.db().collection(collectionName);

		// Upsert the record
		await collection.updateOne(
			{
				hash: cacheObj.hash,
				tempKey: cacheObj.tempKey,
				prompt: cacheObj.prompt,
				opt: cacheObj.cleanOpt
			},
			{
				$set: {
					completion:completion
				}
			},
			{
				upsert: true
			}
		);

		// And return
		return;
	}

	/**
	 * Given the cacheObj, search and get the completion record in cache.
	 */
	async getCacheEmbedding(cacheObj) {
		// Get the collection name
		let collectionName = getCacheCollectionName("embedding", cacheObj);

		// Connect to the collection
		let collection = this.mongoClient.db().collection(collectionName);

		// Search for the record
		let record = await collection.findOne({
			prompt: cacheObj.prompt
		});

		// And return
		if(record) {
			return record.embedding;
		} else {
			return null;
		}
	}

	/**
	 * Given the cacheObj, add the completion record into cache
	 */
	async addCacheEmbedding(cacheObj, embedding) {
		// Get the collection name
		let collectionName = getCacheCollectionName("embedding", cacheObj);

		// Connect to the collection
		let collection = this.mongoClient.db().collection(collectionName);

		// Upsert the record
		await collection.updateOne(
			{
				prompt: cacheObj.prompt,
				opt: cacheObj.cleanOpt
			},
			{
				$set: {
					embedding: embedding
				}
			},
			{
				upsert: true
			}
		);

		// And return
		return;
	}
}
module.exports = MongoDBCache;