'use strict';

const crypto = require('crypto');

/**
 * Utility methods for the LoopBack server.
 */
class Util {
  /**
   * Convert a user profile into a user object. This is an adapted copy of the code
   * in loopback-component-passport that is not so brain-dead that it ignores the
   * fact that a user profile ID might already be an email address.
   * @param {String} provider The provider.
   * @param {Object} profile The user profile.
   * @param {Object} options The options.
   * @return {Object} The user.
   */
  static profileToUser(provider, profile, options) {
    // Let's create a user for that
    let usernameOrId = profile.username || profile.id;
    let actualProvider = profile.provider || provider;
    let email =
      profile.emails && profile.emails[0] && profile.emails[0].value;

    // Check and encode the username/ID (the email local part) if required.
    if (usernameOrId.match(/[^A-Za-z0-9\.\-_]/)) {
      usernameOrId = new Buffer(usernameOrId).toString('hex');
    }

    // Check and encode the provider (the email hostname) if required.
    // Note that unlike the email local part, the email hostname cannot
    // contain underscore characters.
    if (actualProvider.match(/[^A-Za-z0-9\.\-]/)) {
      actualProvider = new Buffer(actualProvider).toString('hex');
    }

    const username = `${actualProvider}.${usernameOrId}`;
    const password = Util.generateKey('password');

    return {
      username,
      password,
      email,
    };
  }

  /**
   * Generate a key
   * @param {String} hmacKey The hmac key, default to 'loopback'
   * @param {String} algorithm The algorithm, default to 'sha1'
   * @param {String} encoding The string encoding, default to 'hex'
   * @returns {String} The generated key
   */
  static generateKey(hmacKey, algorithm, encoding) {
    algorithm = algorithm || 'sha1';
    encoding = encoding || 'hex';

    let hmac = crypto.createHmac(algorithm, hmacKey);
    let buf = crypto.randomBytes(32);

    hmac.update(buf);

    return hmac.digest(encoding);
  }
}

module.exports = Util;
