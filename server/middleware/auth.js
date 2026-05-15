

const withAuth = (handler) => {
  return async (event, ...args) => {
    // TODO: add proper auth checks here later
    // - check if company is selected
    // - check if session is valid
    // - check user permissions
    return await handler(event, ...args);
  };
};

module.exports = { withAuth };