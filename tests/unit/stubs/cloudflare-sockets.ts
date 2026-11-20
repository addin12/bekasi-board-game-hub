// Stand-in for "cloudflare:sockets". The unit tests never open a connection.
export const connect = () => {
  throw new Error("no sockets in unit tests");
};
