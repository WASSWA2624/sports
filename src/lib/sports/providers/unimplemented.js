function buildError(descriptor, methodName) {
  const message = [
    `Provider ${descriptor.code} is registered for env-driven switching,`,
    `but adapter family ${descriptor.adapterFamily} is not implemented yet.`,
    `Attempted method: ${methodName}.`,
  ].join(" ");

  return new Error(message);
}

export class UnimplementedSportsProvider {
  constructor(descriptor) {
    this.descriptor = descriptor;
  }

  fetchTaxonomy() {
    throw buildError(this.descriptor, "fetchTaxonomy");
  }

  fetchFixtures() {
    throw buildError(this.descriptor, "fetchFixtures");
  }

  fetchLivescores() {
    throw buildError(this.descriptor, "fetchLivescores");
  }

  fetchFixtureDetail() {
    throw buildError(this.descriptor, "fetchFixtureDetail");
  }

  fetchStandings() {
    throw buildError(this.descriptor, "fetchStandings");
  }

  fetchOdds() {
    throw buildError(this.descriptor, "fetchOdds");
  }

  fetchTeams() {
    throw buildError(this.descriptor, "fetchTeams");
  }

  fetchNews() {
    throw buildError(this.descriptor, "fetchNews");
  }

  fetchMediaMetadata() {
    throw buildError(this.descriptor, "fetchMediaMetadata");
  }

  fetchPredictions() {
    throw buildError(this.descriptor, "fetchPredictions");
  }
}
