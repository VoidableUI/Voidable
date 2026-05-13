# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

unless Product.count >= 25
  categories = Category.all.to_a
  if categories.empty?
    categories = ["Electronics", "Accessories", "Premium", "Misc"].map { |name| Category.find_or_create_by!(name: name) }
  end

  25.times do |i|
    Product.find_or_create_by!(name: "Product #{i + 1}") do |p|
      p.description = "Description for product #{i + 1}"
      p.price = (rand * 100).round(2)
      p.quantity = rand(1..500)
      p.weight = (rand * 10).round(2)
      p.active = [true, true, true, false].sample
      p.release_date = Date.today - rand(365).days
      p.published_at = Time.current - rand(365).days
      p.available_from = Time.parse("#{rand(6..20)}:00")
      p.category = categories.sample
    end
  end
end
