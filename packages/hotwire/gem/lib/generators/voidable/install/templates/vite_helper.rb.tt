module ViteHelper
  def vite_asset_path(name)
    manifest_path = Rails.root.join("public/assets/.vite/manifest.json")
    if File.exist?(manifest_path)
      manifest = JSON.parse(File.read(manifest_path))
      entry = manifest[name]
      return "/assets/#{entry['file']}" if entry

      if name.end_with?(".css")
        manifest.each_value do |e|
          next unless e["css"]
          css_file = e["css"].find { |f| f.start_with?(File.basename(name, ".css")) }
          return "/assets/#{css_file}" if css_file
        end
      end
    end
    "/assets/#{name}"
  end
end
