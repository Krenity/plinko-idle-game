export class ShardSystem {
  private shards: number = 0;
  private totalShardsEarned: number = 0;

  addShards(amount: number): void {
    this.shards += amount;
    this.totalShardsEarned += amount;
  }

  spendShards(amount: number): boolean {
    if (this.shards >= amount) {
      this.shards -= amount;
      return true;
    }
    return false;
  }

  getShards(): number {
    return this.shards;
  }

  getTotalEarned(): number {
    return this.totalShardsEarned;
  }

  setShards(amount: number): void {
    this.shards = amount;
  }

  setTotalEarned(amount: number): void {
    this.totalShardsEarned = amount;
  }

  reset(): void {
    this.shards = 0;
    this.totalShardsEarned = 0;
  }
}
