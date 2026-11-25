//go:build assets

package embedded

import "embed"

// assetFS holds the @voidable/ui bundle, lit, and the theme CSS, copied by
// `mise run build:assets`.
//
//go:embed all:data/assets
var assetFS embed.FS

const hasAssets = true
