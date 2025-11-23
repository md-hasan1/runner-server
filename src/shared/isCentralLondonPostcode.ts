export const isCentralLondonPostcode = (postcode: string): boolean => {
  const centralPrefixes = ['EC1', 'EC2', 'EC3', 'EC4', 'W1', 'WC1', 'WC2', 'SW1', 'SE1', 'NW1'];
  return centralPrefixes.some(prefix =>
    postcode.replace(/\s+/g, '').toUpperCase().startsWith(prefix)
  );
};
