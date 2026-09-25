const frozen = (values: string[]) => Object.freeze(values);

export const SOURCE_CONFIG = Object.freeze({
  finn: frozen([
    "https://www.finn.no/job/search?q=industrir%C3%B8rlegger",
    "https://www.finn.no/job/search?q=pipefitter"
  ]),
  adecco: frozen(["https://www.adecco.com/nb-no/ledige-stillinger"]),
  simona: frozen(["https://www.simona-stadpipe.com/en/career/"]),
  soprana: frozen(["https://stillinger.soprana.no/"]),
  mojaNorwegia: frozen(["https://www.mojanorwegia.pl/ogloszenia_o_prace/"]),
  vaia: frozen(["https://talents.vaia.com/companies/moja-norwegia/"])
});
