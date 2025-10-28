# Column Name Obfuscation Mapping

This file contains the mapping between original column names and their obfuscated versions for security purposes.

## Telegram Users Table Columns

| Original Name | Obfuscated Name | Description |
|--------------|-----------------|-------------|
| `pepe_balance` | `bal_x7k9m` | PEPE token balance |
| `pepe_advertising_balance` | `bal_j3n8q` | PEPE advertising balance |
| `pepe_withdrawable_balance` | `bal_w5r2t` | Withdrawable PEPE balance |
| `gcoin_v4_balance` | `bal_g4v7y` | G COIN V4 balance |
| `alpha_coins` | `bal_a6c3z` | Alpha coins balance |
| `ton_wallet_address` | `addr_t9w2x` | TON wallet address |

## Important Notes

- **DO NOT** share this mapping file publicly
- **DO NOT** commit this file to public repositories
- Keep this mapping secure and accessible only to authorized developers
- All code references have been updated to use obfuscated names
- Database column names are now obfuscated for additional security layer

## Security Benefits

1. Makes it harder for attackers to understand the database schema
2. Obscures the purpose of sensitive balance columns
3. Adds an extra layer of security through obscurity
4. Requires knowledge of this mapping to understand the data structure

## Migration Date

Applied: 2025-01-13
