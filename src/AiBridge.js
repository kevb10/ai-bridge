// Dependencies
const configObjectMerge = require("@js-util/config-object-merge");
const defaultConfig = require("./core/defaultConfig")

/**
 * Setup the AiBridge instance with the provided configuration
 */
class AiBridge {

    /**
     * Setup the bridge with the relevent config. See config.sample.jsonc for more details.
     * @param {Object} inConfig 
     */
    constructor(inConfig) {

        // Merge the provided config with default values
        this.config = configObjectMerge(defaultConfig, inConfig, true);

        
    }
}