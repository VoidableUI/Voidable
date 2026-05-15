json.extract! sample, :id, :name, :description, :count, :price, :weight, :active, :published_on, :scheduled_at, :opens_at, :category_id, :avatar, :gallery, :created_at, :updated_at
json.url sample_url(sample, format: :json)
json.avatar url_for(sample.avatar)
json.gallery do
  json.array!(sample.gallery) do |gallery|
    json.id gallery.id
    json.url url_for(gallery)
  end
end
