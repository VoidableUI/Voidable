Rails.application.routes.draw do
  resources :samples
  resources :categories
  # Turbo 8 page-refresh morphs and stream morphs on Voidable components.
  resource :morph_lab, only: %i[show update], controller: "morph_lab" do
    post :stream
  end
  # Charts drawn from server data (the gem's chart helpers), refreshed by morph.
  resource :charts_lab, only: %i[show update], controller: "charts_lab"
  # Turbo Drive navigation, Turbo Frames and Turbo Streams on Voidable components.
  get "turbo_lab", to: "turbo_lab#show", as: :turbo_lab
  get "turbo_lab/two", to: "turbo_lab#two", as: :turbo_lab_two
  match "turbo_lab/frame", to: "turbo_lab#frame", via: %i[get post], as: :turbo_lab_frame
  post "turbo_lab/stream", to: "turbo_lab#stream", as: :turbo_lab_stream
  post "toggle_layout", to: "settings#toggle_layout"
  devise_for :users
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  # root "posts#index"
end
