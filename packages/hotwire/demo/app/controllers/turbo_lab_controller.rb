# Turbo Drive navigation, Turbo Frames and Turbo Streams on Voidable components.
# The browser tests in tests/browser/server/rails drive these pages; they also
# show the behaviour by hand. (Page-refresh and stream morphs are MorphLabController.)
class TurboLabController < ApplicationController
  skip_forgery_protection only: :stream

  def show
  end

  def two
  end

  # GET loads the frame's content; POST is the form inside it and shows what the server received.
  def frame
    @received = params.permit(:title, :kind, :urgent, :seats, skills: []).to_h if request.post?
  end

  # Answers with a Turbo Stream for the action named in params[:op].
  def stream
    n = session[:turbo_lab_items].to_i
    n = 3 if n < 3
    n += 1
    session[:turbo_lab_items] = n
    streams =
      case params[:op].to_s
      when "append" then [ turbo_stream.append("items", partial: "turbo_lab/item", locals: { n: n }) ]
      when "prepend" then [ turbo_stream.prepend("items", partial: "turbo_lab/item", locals: { n: n }) ]
      when "replace" then [ turbo_stream.replace("item-1", partial: "turbo_lab/item", locals: { n: 1, label: "Replaced" }) ]
      when "update" then [ turbo_stream.update("item-2", partial: "turbo_lab/item_body", locals: { n: 2, label: "Updated" }) ]
      when "remove" then [ turbo_stream.remove("item-3") ]
      when "before" then [ turbo_stream.before("item-2", partial: "turbo_lab/item", locals: { n: n }) ]
      when "after" then [ turbo_stream.after("item-2", partial: "turbo_lab/item", locals: { n: n }) ]
      else []
      end
    render turbo_stream: streams
  end
end
