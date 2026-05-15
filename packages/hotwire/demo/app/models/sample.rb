class Sample < ApplicationRecord
  belongs_to :category
  has_one_attached :avatar
  has_many_attached :gallery
end
