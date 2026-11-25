//go:build !assets

package embedded

import "embed"

// assetFS is empty without the "assets" build tag.
var assetFS embed.FS

const hasAssets = false
