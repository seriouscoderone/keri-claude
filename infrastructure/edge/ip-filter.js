// CloudFront Function: IP whitelist with landing page fallback
// Runtime: cloudfront-js-2.0 (viewer-request)

var ALLOWED_CIDRS = __ALLOWED_CIDRS__;
var LANDING_PAGE_HTML = __LANDING_PAGE_HTML__;

function parseCidr(cidr) {
  var parts = cidr.split('/');
  var ip = parts[0];
  var mask = parts.length > 1 ? parseInt(parts[1], 10) : 32;
  var octets = ip.split('.');
  var ipNum = ((parseInt(octets[0], 10) << 24) >>> 0)
    + ((parseInt(octets[1], 10) << 16) >>> 0)
    + ((parseInt(octets[2], 10) << 8) >>> 0)
    + (parseInt(octets[3], 10) >>> 0);
  var maskBits = mask === 0 ? 0 : ((0xffffffff << (32 - mask)) >>> 0);
  return { network: (ipNum & maskBits) >>> 0, mask: maskBits };
}

function ipToNum(ip) {
  var octets = ip.split('.');
  return ((parseInt(octets[0], 10) << 24) >>> 0)
    + ((parseInt(octets[1], 10) << 16) >>> 0)
    + ((parseInt(octets[2], 10) << 8) >>> 0)
    + (parseInt(octets[3], 10) >>> 0);
}

function handler(event) {
  var ip = event.viewer.ip;

  for (var i = 0; i < ALLOWED_CIDRS.length; i++) {
    if (ALLOWED_CIDRS[i] === '0.0.0.0/0') {
      return event.request;
    }
    var cidr = parseCidr(ALLOWED_CIDRS[i]);
    var num = ipToNum(ip);
    if (((num & cidr.mask) >>> 0) === cidr.network) {
      return event.request;
    }
  }

  return {
    statusCode: 200,
    statusDescription: 'OK',
    headers: { 'content-type': { value: 'text/html' } },
    body: LANDING_PAGE_HTML
  };
}
