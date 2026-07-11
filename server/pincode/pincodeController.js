const pincodeService = require('./pincodeService');

module.exports = {
  lookup: async (event, pincode) => {
    return pincodeService.lookup(pincode);
  },
};
